// Charger les variables d'environnement
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const { logAction } = require('./logger');

// Middlewares de sécurité
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

const app = express();
const port = process.env.PORT || 8000;

// Configurer Express pour être derrière un reverse proxy
app.set('trust proxy', process.env.TRUST_PROXY === 'true' || 1);

// Middlewares de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
    },
  },
  // Désactiver HSTS car géré par le reverse proxy
  hsts: false,
}));

// Rate limiting pour les API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Rate limiting plus strict pour les uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 uploads par 15 minutes
  message: 'Trop de téléversements, veuillez réessayer plus tard.',
});
app.use('/api/upload', uploadLimiter);

// Sanitization
app.use(mongoSanitize()); // Protection injection NoSQL
app.use(xss()); // Protection XSS
app.use(hpp()); // Protection HTTP Parameter Pollution

// Middleware to parse JSON bodies, which will be used for API requests.
app.use(express.json({ limit: '10mb' })); // Limiter la taille du body JSON

// Configuration de session sécurisée
const isProduction = process.env.NODE_ENV === 'production';
app.use(session({
  secret: process.env.SESSION_SECRET || (() => {
    if (isProduction) {
      throw new Error('SESSION_SECRET must be set in environment variables for production');
    }
    return 'dev-secret-change-in-production';
  })(),
  resave: false,
  saveUninitialized: false, // false en production pour la sécurité
  cookie: { 
    secure: isProduction, // true si HTTPS (géré par le reverse proxy)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 heures
    sameSite: 'strict'
  }
}));

/**
 * Middleware d'authentification pour protéger les routes.
 * Actuellement désactivé : toutes les requêtes sont autorisées.
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @param {Function} next - Fonction pour passer au middleware suivant
 * @returns {void}
 */
const checkAuth = (req, res, next) => {
  // AUTHENTICATION DISABLED: No check, all requests are allowed.
  next();
};

/**
 * Helper pour obtenir l'auteur depuis la session.
 * @param {express.Request} req - L'objet requête Express
 * @returns {object} - { name: string, sessionId: string }
 */
function getAuthor(req) {
  if (req.session && req.session.user) {
    return { name: req.session.user.name || 'unknown', sessionId: req.sessionID || null };
  }
  return { name: 'anonymous', sessionId: req.sessionID || null };
}

// Serve static files from the 'blueprint_local' directory
app.use(express.static(path.join(__dirname, 'blueprint_local')));

// Route spécifique pour page_accueil.html (redirection vers le bon chemin)
app.get('/page_accueil.html', (req, res) => {
  res.redirect('/public/page_accueil.html');
});

// Alias /images to /public/images for convenience
app.use('/images', express.static(path.join(__dirname, 'blueprint_local', 'public', 'images')));
app.use('/styles', express.static(path.join(__dirname, 'blueprint_local', 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'blueprint_local', 'public', 'scripts')));

// Protect the 'intranet' and 'admin' directories
app.use('/intranet', checkAuth);
app.use('/admin', checkAuth);

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');
const PUBLISHED_DIR = path.join(__dirname, 'blueprint_local', 'public', 'projects', 'published');
const PUBLISHED_MD_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'published_md');
const REJECTION_REASONS_FILE = path.join(__dirname, 'rejection_reasons.json');


/**
 * Route API pour la connexion simulée (développement uniquement).
 * Crée une session utilisateur avec le nom d'utilisateur fourni.
 * @route POST /api/login
 * @param {express.Request} req - L'objet requête Express contenant { username: string } dans le body
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès ou d'erreur
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // Create a user session
    req.session.user = { name: username };

      // Log the login event
    await logAction('USER_LOGIN', { data: { user: username, result: 'success' } }, { name: username, sessionId: req.sessionID });

    res.status(200).json({ message: 'Login successful.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

/**
 * Fonction utilitaire pour lister les fichiers de projet dans un répertoire.
 * Filtre les fichiers pour ne retourner que les fichiers .md (brouillons) ou .html (projets publiés).
 * @param {string} dir - Le chemin du répertoire à lister
 * @returns {Promise<string[]>} Tableau des noms de fichiers de projet (.md ou .html)
 * @throws {Error} Si une erreur survient (sauf si le répertoire n'existe pas, auquel cas retourne [])
 */
const listProjects = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    // Drafts are .md, published projects are .html
    return files.filter(file => file.endsWith('.md') || file.endsWith('.html'));
  } catch (error) {
    // If the directory doesn't exist, return an empty array.
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

/**
 * Route API pour lister les projets en attente de relecture (admin uniquement).
 * Filtre les projets par statut 'pending_review' et permet le tri et le filtrage par tag.
 * @route GET /api/projects/drafts
 * @param {express.Request} req - L'objet requête Express avec query params : sortBy (date|title), tag (optionnel)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau des projets en attente
 */
app.get('/api/projects/drafts', checkAuth, async (req, res) => {
  try {
    const { sortBy, tag } = req.query;

    const files = await fs.readdir(DRAFTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    let projects = await Promise.all(mdFiles.map(async file => {
      const filePath = path.join(DRAFTS_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const { data } = matter(fileContent);
      // Retourner l'objet projet complet pour le filtrage
      return { ...data, fileName: file };
    }));

    // Filtrer pour ne garder que les projets en attente de relecture
    projects = projects.filter(p => p.status === 'pending_review');

    // Filtering by tag
    if (tag) {
      projects = projects.filter(p => p.tags.includes(tag));
    }

    // Sorting (defaults to by date descending)
    if (sortBy === 'date' || !sortBy) {
      projects.sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification));
    } else if (sortBy === 'title') {
      projects.sort((a, b) => a.titre.localeCompare(b.titre));
    }

    res.json(projects);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If the directory doesn't exist, return an empty array.
      return res.json([]);
    }
    console.error('Error listing draft projects:', error);
    res.status(500).json({ error: 'Failed to list draft projects' });
  }
});

/**
 * Route API pour que les étudiants listent tous leurs brouillons, quel que soit leur statut.
 * Retourne tous les brouillons de l'utilisateur, triés par date de modification (plus récent en premier).
 * @route GET /api/projects/my_drafts
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau de tous les brouillons de l'utilisateur
 */
app.get('/api/projects/my_drafts', checkAuth, async (req, res) => {
  try {
    const files = await fs.readdir(DRAFTS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    let projects = await Promise.all(mdFiles.map(async file => {
      const filePath = path.join(DRAFTS_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const { data } = matter(fileContent);
      return { ...data, fileName: file };
    }));

    // Sort by modification date by default
    projects.sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification));

    res.json(projects);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json([]);
    }
    console.error('Error listing student drafts:', error);
    res.status(500).json({ error: 'Failed to list student drafts' });
  }
});

/**
 * Route API pour lister les projets publiés avec tri et filtrage.
 * Permet de filtrer par tag et de trier par date ou titre. Peut inclure les informations de mise en avant.
 * @route GET /api/projects/published
 * @param {express.Request} req - L'objet requête Express avec query params : sortBy (date|title), tag (optionnel), include_featured (true|false)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau des projets publiés
 */
app.get('/api/projects/published', async (req, res) => {
  try {
    const { sortBy, tag, include_featured } = req.query;

    const featuredConfigPath = path.join(__dirname, 'featured_projects.json');
    let featuredConfig = { featured: [] };
    try {
      featuredConfig = JSON.parse(await fs.readFile(featuredConfigPath, 'utf8'));
    } catch (error) {
      // Le fichier n'existe pas encore, c'est normal
    }
    const featuredMap = new Map(featuredConfig.featured.map(p => [p.fileName, p.position]));

    // We now read from the directory containing the Markdown files of published projects
    const files = await fs.readdir(PUBLISHED_MD_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    let projects = await Promise.all(mdFiles.map(async file => {
      const filePath = path.join(PUBLISHED_MD_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const { data, content } = matter(fileContent);
      const htmlFileName = file.replace('.md', '.html');
      
      // Extraire les deux premières lignes de la description depuis le contenu HTML
      let description = '';
      try {
        // Extraction simple avec regex pour trouver le texte dans les paragraphes
        // Chercher dans la section Accueil ou intro-text-block
        const introTextMatch = content.match(/(?:intro-text-block|#Accueil)[^>]*>[\s\S]*?<p[^>]*>([^<]+)<\/p>/i);
        if (introTextMatch) {
          const text = introTextMatch[1];
          // Nettoyer le HTML et extraire les deux premières lignes
          const cleanText = text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
          const lines = cleanText.split(/[.!?]\s+/).filter(l => l.trim()).slice(0, 2);
          description = lines.join('. ').trim();
        } else {
          // Fallback : chercher le premier paragraphe
          const firstPMatch = content.match(/<p[^>]*>([^<]+)<\/p>/i);
          if (firstPMatch) {
            const text = firstPMatch[1];
            const cleanText = text.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
            const lines = cleanText.split(/[.!?]\s+/).filter(l => l.trim()).slice(0, 2);
            description = lines.join('. ').trim();
          }
        }
      } catch (error) {
        // En cas d'erreur, description reste vide
        console.warn('Error extracting description:', error);
      }
      
      const projectData = {
        fileName: htmlFileName,
        titre: data.titre,
        tags: data.tags || [],
        dateModification: data.dateModification,
        description: description || ''
      };

      if (include_featured === 'true') {
        projectData.isFeatured = featuredMap.has(htmlFileName);
        projectData.featuredPosition = featuredMap.get(htmlFileName) || null;
      }

      return projectData;
    }));

    // Filtering by tag
    if (tag) {
      projects = projects.filter(p => p.tags.includes(tag));
    }

    // Sorting (defaults to by date descending)
    if (sortBy === 'date' || !sortBy) {
      projects.sort((a, b) => new Date(b.dateModification) - new Date(a.dateModification));
    } else if (sortBy === 'title') {
      projects.sort((a, b) => a.titre.localeCompare(b.titre));
    }

    res.json(projects);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.json([]); // The directory doesn't exist yet, which is fine.
    }
    console.error('Error listing published projects:', error);
    res.status(500).json({ error: 'Failed to list published projects' });
  }
});

/**
 * Route API pour récupérer le template de projet (contenu principal uniquement).
 * Extrait uniquement le contenu de la balise <main>, sans le header ni le footer.
 * @route GET /api/templates/project
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse HTML avec le contenu de la balise <main>
 */
app.get('/api/templates/project', checkAuth, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'blueprint_local', 'public', 'templates', 'page_projet.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Extract only the content within the <main> tag (not header/footer)
    const mainContentMatch = templateContent.match(/<main[^>]*>([\s\S]*)<\/main>/i);
    const extractedContent = mainContentMatch ? mainContentMatch[1] : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(extractedContent);
  } catch (error) {
    console.error('Error reading project template:', error);
    res.status(500).json({ error: 'Failed to read project template' });
  }
});

/**
 * Route API pour récupérer le template complet de projet (avec header et footer).
 * Utilisé pour l'aperçu dans l'éditeur et la page de relecture admin.
 * @route GET /api/templates/project_full
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse HTML avec le template complet
 */
app.get('/api/templates/project_full', checkAuth, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'blueprint_local', 'public', 'templates', 'page_projet.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(templateContent);
  } catch (error) {
    console.error('Error reading full project template:', error);
    res.status(500).json({ error: 'Failed to read full project template' });
  }
});

/**
 * Route API pour récupérer le contenu d'un projet unique.
 * Lit un fichier Markdown et retourne le front matter et le contenu HTML.
 * @route GET /api/project
 * @param {express.Request} req - L'objet requête Express avec query params : file (nom du fichier), type (draft|published)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec { frontMatter: object, content: string }
 */
app.get('/api/project', async (req, res) => {
  const { file, type } = req.query;
  if (!file || !type) {
    return res.status(400).json({ error: 'File and type are required' });
  }

  const dir = type === 'draft' ? DRAFTS_DIR : PUBLISHED_DIR;
  const filePath = path.join(dir, file);

  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    // Charger le motif de rejet depuis le fichier JSON si c'est un draft
    let rejectionReason = null;
    let rejectedAt = null;
    if (type === 'draft' && data.status === 'rejected') {
      try {
        const rejectionData = await fs.readFile(REJECTION_REASONS_FILE, 'utf8');
        const rejectionReasons = JSON.parse(rejectionData);
        if (rejectionReasons[file]) {
          rejectionReason = rejectionReasons[file].reason || '';
          rejectedAt = rejectionReasons[file].rejectedAt || data.rejectedAt;
        }
      } catch (error) {
        // Fichier n'existe pas ou erreur, on continue sans motif
        console.warn('Could not read rejection reasons file:', error.message);
      }
    }

    // Ajouter le motif de rejet au frontMatter pour la compatibilité
    const frontMatterWithRejection = { ...data };
    // Toujours ajouter rejectionReason même si vide, pour que le client puisse distinguer "pas de motif" de "motif vide"
    if (rejectionReason !== null) {
      frontMatterWithRejection.rejectionReason = rejectionReason;
      if (rejectedAt) {
        frontMatterWithRejection.rejectedAt = rejectedAt;
      }
    }

    // Send the parsed front matter (for the title) and the HTML content back
    res.json({ frontMatter: frontMatterWithRejection, content: content });
  } catch (error) {
    console.error('Error reading project file:', error);
    res.status(500).json({ error: 'Failed to read project file' });
  }
});

/**
 * Route API pour créer ou mettre à jour un brouillon de projet.
 * Génère un nom de fichier unique à partir du titre, préserve la date de création et le statut existant.
 * @route POST /api/drafts
 * @param {express.Request} req - L'objet requête Express avec body : { titre: string, content: string, tags: string[], currentFile?: string }
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec { message: string, file: string } (nom du fichier créé/modifié)
 */
app.post('/api/drafts', checkAuth, [
  body('titre').trim().isLength({ min: 1, max: 200 }).withMessage('Le titre doit contenir entre 1 et 200 caractères').escape(),
  body('content').optional().isString().withMessage('Le contenu doit être une chaîne de caractères'),
  body('tags').optional().isArray().withMessage('Les tags doivent être un tableau'),
  body('tags.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Chaque tag doit contenir entre 1 et 50 caractères'),
  body('currentFile').optional().isString().withMessage('Le nom de fichier actuel doit être une chaîne'),
], async (req, res) => {
  // Vérifier les erreurs de validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { titre, content, tags, currentFile } = req.body;

    if (!titre) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Sanitize the title and create a unique filename
    const { createUniqueFilename } = require('./utils/filename-sanitizer');
    const newFileName = await createUniqueFilename(titre, DRAFTS_DIR, '.md', currentFile);
    const newFilePath = path.join(DRAFTS_DIR, newFileName);

    const oldFilePath = currentFile ? path.join(DRAFTS_DIR, currentFile) : null;
    let dateCreation = new Date().toISOString(); // Default to now

    // If a file exists, read its creation date to preserve it
    if (currentFile) {
        try {
            const oldContent = await fs.readFile(oldFilePath, 'utf8');
            const oldFrontMatter = matter(oldContent).data;
            if (oldFrontMatter.dateCreation) {
                dateCreation = oldFrontMatter.dateCreation;
            }
        } catch (error) {
            // File might not exist if it's a new draft, which is fine
        }
    }

    // If we are renaming the file, delete the old one
    if (oldFilePath && currentFile !== newFileName) {
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error(`Could not delete old file: ${oldFilePath}`, error);
      }
    }

    let status = 'draft'; // Default for new files

    // If updating, preserve the existing status, unless it's 'pending_review'.
    // Saving a draft should never result in a 'pending_review' status.
    if (currentFile) {
        try {
            const oldContent = await fs.readFile(oldFilePath, 'utf8');
            const oldFrontMatter = matter(oldContent).data;
            if (oldFrontMatter.status && oldFrontMatter.status !== 'pending_review') {
                status = oldFrontMatter.status;
            }
        } catch (error) {
            // It's a new draft, status remains 'draft'
        }
    }

    // Create front matter with dates, tags, and status
    const frontMatter = {
      titre: titre,
      tags: tags || [],
      status: status, // Use preserved or default status
      dateCreation: dateCreation,
      dateModification: new Date().toISOString()
    };
    const fileContent = matter.stringify(content || '', frontMatter);

    await fs.mkdir(DRAFTS_DIR, { recursive: true });
    await fs.writeFile(newFilePath, fileContent);

    await logAction('SAVE_DRAFT', { file: newFileName, result: 'success' }, getAuthor(req));
    res.status(201).json({ message: 'Draft saved successfully', file: newFileName });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

/**
 * Route API pour soumettre un brouillon pour relecture.
 * Met à jour le statut du projet à 'pending_review' et la date de modification.
 * @route POST /api/submit_for_review
 * @param {express.Request} req - L'objet requête Express avec body : { file: string } (nom du fichier)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès
 */
app.post('/api/submit_for_review', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const filePath = path.join(DRAFTS_DIR, file);

    // Read the existing draft
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    // Update the status
    frontMatter.status = 'pending_review';
    frontMatter.dateModification = new Date().toISOString();

    // Write the updated content back to the file
    const updatedFileContent = matter.stringify(content, frontMatter);
    await fs.writeFile(filePath, updatedFileContent);

    await logAction('SUBMIT_FOR_REVIEW', { file, result: 'success' }, getAuthor(req));
    res.status(200).json({ message: 'Draft submitted for review successfully' });

  } catch (error) {
    console.error('Error submitting draft for review:', error);
    res.status(500).json({ error: 'Failed to submit draft for review' });
  }
});

/**
 * Route API pour rejeter un brouillon (admin uniquement).
 * Met à jour le statut du projet à 'rejected' et la date de modification.
 * @route POST /api/reject_draft
 * @param {express.Request} req - L'objet requête Express avec body : { file: string } (nom du fichier)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès
 */
app.post('/api/reject_draft', checkAuth, async (req, res) => {
  try {
    const { file, rejectionReason } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const filePath = path.join(DRAFTS_DIR, file);

    // Read, update status, and write back
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    frontMatter.status = 'rejected';
    frontMatter.rejectedAt = new Date().toISOString();
    frontMatter.dateModification = new Date().toISOString();

    const updatedFileContent = matter.stringify(content, frontMatter);
    await fs.writeFile(filePath, updatedFileContent);

    // Sauvegarder le motif de rejet dans un fichier JSON séparé (plus fiable que le front matter)
    const trimmedReason = rejectionReason ? rejectionReason.trim() : '';
    let rejectionReasons = {};
    try {
      const existingData = await fs.readFile(REJECTION_REASONS_FILE, 'utf8');
      rejectionReasons = JSON.parse(existingData);
    } catch (error) {
      // Fichier n'existe pas encore ou erreur de lecture, on crée un nouvel objet
      rejectionReasons = {};
    }
    
    rejectionReasons[file] = {
      reason: trimmedReason,
      rejectedAt: frontMatter.rejectedAt,
      rejectedBy: getAuthor(req).name
    };
    
    try {
      await fs.writeFile(REJECTION_REASONS_FILE, JSON.stringify(rejectionReasons, null, 2), 'utf8');
    } catch (writeError) {
      console.error('Error writing rejection reason file:', writeError);
      // Ne pas faire échouer la requête, mais logger l'erreur
    }

    // Envoyer un email noreply si un email est configuré
    // Note: Pour l'instant, on log juste l'action. L'implémentation complète de l'email nécessiterait nodemailer
    // et une configuration SMTP. On peut ajouter cela plus tard si nécessaire.
    const authorEmail = frontMatter.authorEmail || null; // À extraire depuis les métadonnées du projet si disponible
    
    await logAction('REJECT_DRAFT', { 
      file, 
      rejectionReason: trimmedReason,
      authorEmail: authorEmail,
      result: 'success' 
    }, getAuthor(req));
    
    res.status(200).json({ message: 'Draft rejected successfully' });

  } catch (error) {
    console.error('Error rejecting draft:', error);
    res.status(500).json({ error: 'Failed to reject draft' });
  }
});

/**
 * Route API pour publier un projet (admin uniquement).
 * Génère un fichier HTML à partir du template et du contenu du brouillon, déplace le Markdown vers published_md,
 * et ajoute automatiquement les nouveaux tags à available_tags.json.
 * @route POST /api/publish
 * @param {express.Request} req - L'objet requête Express avec body : { file: string } (nom du fichier .md)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès et le nom du fichier HTML créé
 */
app.post('/api/publish', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const sourceMdPath = path.join(DRAFTS_DIR, file);

    // 1. Read the draft's Markdown file and extract its content and front matter
    const mdContent = await fs.readFile(sourceMdPath, 'utf8');
    const { data: frontMatter, content: draftHtmlContent } = matter(mdContent);

    // 2. Read the project page template
    const templatePath = path.join(__dirname, 'blueprint_local', 'public', 'templates', 'page_projet.html');
    let templateContent = await fs.readFile(templatePath, 'utf8');

    // 3. Replace the template's title and inject the draft's HTML content into the main container
    let finalHtml = templateContent.replace(/<title>.*<\/title>/i, `<title>${frontMatter.titre} - BluePrint</title>`);
    
    // S'assurer que le CSS page_projet.css est inclus
    if (!finalHtml.includes('page_projet.css')) {
        finalHtml = finalHtml.replace(
            /(<link rel="stylesheet" href="\/styles\/visuel_bulma\.css">)/i,
            `$1\n<link rel="stylesheet" href="/styles/page_projet.css">`
        );
    }
    
    // Mettre à jour le titre dans le bandeau
    finalHtml = finalHtml.replace(
        /(<div class="bandeau-texte[^"]*">)[^<]*(<\/div>)/i,
        `$1${frontMatter.titre}$2`
    );
    
    // Nettoyer le contenu du brouillon : retirer les balises de fermeture HTML qui pourraient causer des problèmes
    let cleanedContent = draftHtmlContent
        .replace(/<\/main>/gi, '') // Retirer les balises </main> qui pourraient être dans le contenu
        .replace(/<\/body>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Retirer les scripts qui ne doivent pas être dans le main
        .replace(/<footer[\s\S]*?<\/footer>/gi, '') // Retirer aussi les footers qui pourraient être dans le contenu
        .trim();
    
    // Injecter le contenu nettoyé dans le main
    // Trouver la position exacte du premier <main> et du premier </main> dans le template
    const mainOpenIndex = finalHtml.indexOf('<main');
    const mainOpenEndIndex = finalHtml.indexOf('>', mainOpenIndex) + 1;
    const mainCloseIndex = finalHtml.indexOf('</main>', mainOpenEndIndex);
    
    if (mainOpenIndex !== -1 && mainCloseIndex !== -1) {
        // Extraire les parties avant et après le main
        const beforeMain = finalHtml.substring(0, mainOpenEndIndex);
        const afterMain = finalHtml.substring(mainCloseIndex);
        
        // Reconstruire avec le contenu nettoyé
        finalHtml = beforeMain + cleanedContent + afterMain;
    } else {
        console.warn('Balises <main> non trouvées dans le template, utilisation de la méthode regex');
        finalHtml = finalHtml.replace(
            /(<main[^>]*>)[\s\S]*?(<\/main>)/i,
            `$1${cleanedContent}$2`
        );
    }


    // 4. Create the destination HTML file path
    const htmlFileName = file.replace('.md', '.html');
    const destHtmlPath = path.join(PUBLISHED_DIR, htmlFileName);

    // 5. Write the final, complete HTML to the new file
    await fs.mkdir(PUBLISHED_DIR, { recursive: true });
    await fs.writeFile(destHtmlPath, finalHtml);

    // 6. Move the original Markdown file to the published_md directory
    await fs.mkdir(PUBLISHED_MD_DIR, { recursive: true });
    const destMdPath = path.join(PUBLISHED_MD_DIR, file);
    await fs.rename(sourceMdPath, destMdPath);

    // 6.5. Supprimer le motif de rejet du fichier JSON si le projet était rejeté
    try {
      const rejectionData = await fs.readFile(REJECTION_REASONS_FILE, 'utf8');
      const rejectionReasons = JSON.parse(rejectionData);
      if (rejectionReasons[file]) {
        delete rejectionReasons[file];
        await fs.writeFile(REJECTION_REASONS_FILE, JSON.stringify(rejectionReasons, null, 2), 'utf8');
      }
    } catch (error) {
      // Fichier n'existe pas ou erreur, on continue
      console.warn('Could not clean rejection reason:', error.message);
    }

    // 7. Ajouter les nouveaux tags au fichier available_tags.json
    if (frontMatter.tags && Array.isArray(frontMatter.tags) && frontMatter.tags.length > 0) {
      const tagsFilePath = path.join(__dirname, 'available_tags.json');
      let tagsData = { tags: [] };
      try {
        const tagsContent = await fs.readFile(tagsFilePath, 'utf8');
        tagsData = JSON.parse(tagsContent);
      } catch (error) {
        // Le fichier n'existe pas encore, on le créera
      }
      
      // Ajouter les nouveaux tags qui n'existent pas déjà
      const existingTags = new Set(tagsData.tags.map(t => t.toLowerCase()));
      frontMatter.tags.forEach(tag => {
        if (tag && !existingTags.has(tag.toLowerCase())) {
          tagsData.tags.push(tag);
          existingTags.add(tag.toLowerCase());
        }
      });
      
      // Trier les tags par ordre alphabétique
      tagsData.tags.sort();
      
      // Sauvegarder le fichier
      await fs.writeFile(tagsFilePath, JSON.stringify(tagsData, null, 2));
    }

    await logAction('PUBLISH_PROJECT', { file: htmlFileName, result: 'success' }, getAuthor(req));
    res.json({ message: `Project ${htmlFileName} published successfully` });
  } catch (error) {
    console.error('Error publishing project:', error);
    res.status(500).json({ error: 'Failed to publish project' });
  }
});

/**
 * Route API pour dépublier un projet (admin uniquement).
 * Supprime le fichier HTML publié et le fichier Markdown publié.
 * @route POST /api/unpublish
 * @param {express.Request} req - L'objet requête Express avec body : { file: string } (nom du fichier HTML)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès
 */
app.post('/api/unpublish', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    // Le fichier fourni est le nom du fichier HTML (ex: projet.html)
    // On doit aussi supprimer le fichier Markdown correspondant (ex: projet.md)
    const htmlFileName = file.endsWith('.html') ? file : `${file}.html`;
    const mdFileName = htmlFileName.replace('.html', '.md');

    const htmlFilePath = path.join(PUBLISHED_DIR, htmlFileName);
    const mdFilePath = path.join(PUBLISHED_MD_DIR, mdFileName);

    let deletedFiles = [];
    let errors = [];

    // Supprimer le fichier HTML publié
    try {
      await fs.unlink(htmlFilePath);
      deletedFiles.push(htmlFileName);
      console.log(`Deleted HTML file: ${htmlFilePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        errors.push(`HTML: ${error.message}`);
        console.error(`Could not delete HTML file ${htmlFilePath}:`, error);
      } else {
        console.log(`HTML file not found (already deleted?): ${htmlFilePath}`);
      }
    }

    // Supprimer le fichier Markdown publié
    try {
      await fs.unlink(mdFilePath);
      deletedFiles.push(mdFileName);
      console.log(`Deleted Markdown file: ${mdFilePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        errors.push(`MD: ${error.message}`);
        console.error(`Could not delete Markdown file ${mdFilePath}:`, error);
      } else {
        console.log(`Markdown file not found (already deleted?): ${mdFilePath}`);
      }
    }

    // Retirer le projet de la liste featured si présent
    const featuredConfigPath = path.join(__dirname, 'featured_projects.json');
    try {
      const featuredConfig = JSON.parse(await fs.readFile(featuredConfigPath, 'utf8'));
      const beforeCount = featuredConfig.featured.length;
      featuredConfig.featured = featuredConfig.featured.filter(p => p.fileName !== htmlFileName);
      const afterCount = featuredConfig.featured.length;
      if (beforeCount !== afterCount) {
        await fs.writeFile(featuredConfigPath, JSON.stringify(featuredConfig, null, 2));
        console.log(`Removed ${htmlFileName} from featured projects`);
      }
    } catch (error) {
      // Le fichier featured n'existe pas ou erreur, ce n'est pas grave
      console.warn('Could not update featured projects config:', error);
    }

    if (errors.length > 0 && deletedFiles.length === 0) {
      // Aucun fichier n'a été supprimé et il y a des erreurs
      return res.status(500).json({ error: `Failed to delete files: ${errors.join(', ')}` });
    }

    await logAction('UNPUBLISH_PROJECT', { 
      file: htmlFileName, 
      deletedFiles: deletedFiles,
      errors: errors.length > 0 ? errors : undefined,
      result: 'success' 
    }, getAuthor(req));
    
    res.status(200).json({ 
      message: `Project ${htmlFileName} unpublished successfully`,
      deletedFiles: deletedFiles
    });
  } catch (error) {
    console.error('Error unpublishing project:', error);
    res.status(500).json({ error: `Failed to unpublish project: ${error.message}` });
  }
});

/**
 * Route API pour récupérer tous les tags disponibles.
 * Lit le fichier available_tags.json et retourne la liste des tags.
 * @route GET /api/tags
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau de tags
 */
app.get('/api/tags', async (req, res) => {
  try {
    const tagsFilePath = path.join(__dirname, 'available_tags.json');
    let tagsData = { tags: [] };
    try {
      const tagsContent = await fs.readFile(tagsFilePath, 'utf8');
      tagsData = JSON.parse(tagsContent);
    } catch (error) {
      // Le fichier n'existe pas encore, retourner une liste vide
    }
    res.json(tagsData.tags || []);
  } catch (error) {
    console.error('Error reading tags:', error);
    res.status(500).json({ error: 'Failed to read tags' });
  }
});

/**
 * Route API pour ajouter de nouveaux tags (admin uniquement).
 * Ajoute les tags fournis à available_tags.json s'ils n'existent pas déjà (comparaison insensible à la casse).
 * @route POST /api/tags
 * @param {express.Request} req - L'objet requête Express avec body : { tags: string[] }
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès et la liste complète des tags
 */
app.post('/api/tags', checkAuth, async (req, res) => {
  try {
    const { tags } = req.body;
    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const tagsFilePath = path.join(__dirname, 'available_tags.json');
    let tagsData = { tags: [] };
    try {
      const tagsContent = await fs.readFile(tagsFilePath, 'utf8');
      tagsData = JSON.parse(tagsContent);
    } catch (error) {
      // Le fichier n'existe pas encore, on le créera
    }

    // Ajouter les nouveaux tags qui n'existent pas déjà
    const existingTags = new Set(tagsData.tags.map(t => t.toLowerCase()));
    tags.forEach(tag => {
      if (tag && typeof tag === 'string' && !existingTags.has(tag.toLowerCase())) {
        tagsData.tags.push(tag);
        existingTags.add(tag.toLowerCase());
      }
    });

    // Trier les tags par ordre alphabétique
    tagsData.tags.sort();

    // Sauvegarder le fichier
    await fs.writeFile(tagsFilePath, JSON.stringify(tagsData, null, 2));

    res.json({ message: 'Tags added successfully', tags: tagsData.tags });
  } catch (error) {
    console.error('Error adding tags:', error);
    res.status(500).json({ error: 'Failed to add tags' });
  }
});

/**
 * Route API pour récupérer la liste des encadrants disponibles.
 * @route GET /api/encadrants
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau des encadrants
 */
app.get('/api/encadrants', async (req, res) => {
  try {
    const encadrantsFilePath = path.join(__dirname, 'available_encadrants.json');
    let encadrantsData = { encadrants: [] };
    try {
      const encadrantsContent = await fs.readFile(encadrantsFilePath, 'utf8');
      encadrantsData = JSON.parse(encadrantsContent);
    } catch (error) {
      // Le fichier n'existe pas encore, retourner une liste vide
    }
    res.json(encadrantsData.encadrants || []);
  } catch (error) {
    console.error('Error reading encadrants:', error);
    res.status(500).json({ error: 'Failed to read encadrants' });
  }
});

/**
 * Route API pour ajouter un nouvel encadrant (admin uniquement).
 * @route POST /api/encadrants
 * @param {express.Request} req - L'objet requête Express avec body : { name: string, email: string, imageUrl?: string }
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès et la liste complète des encadrants
 */
app.post('/api/encadrants', checkAuth, async (req, res) => {
  try {
    const { name, email, imageUrl } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const encadrantsFilePath = path.join(__dirname, 'available_encadrants.json');
    let encadrantsData = { encadrants: [] };
    try {
      const encadrantsContent = await fs.readFile(encadrantsFilePath, 'utf8');
      encadrantsData = JSON.parse(encadrantsContent);
    } catch (error) {
      // Le fichier n'existe pas encore, on le créera
    }

    // Vérifier si l'encadrant existe déjà (par email)
    const existingIndex = encadrantsData.encadrants.findIndex(
      e => e.email.toLowerCase() === email.toLowerCase()
    );

    if (existingIndex >= 0) {
      // Mettre à jour l'encadrant existant
      encadrantsData.encadrants[existingIndex] = {
        name,
        email,
        imageUrl: imageUrl || encadrantsData.encadrants[existingIndex].imageUrl
      };
    } else {
      // Ajouter le nouvel encadrant
      encadrantsData.encadrants.push({
        name,
        email,
        imageUrl: imageUrl || ''
      });
    }

    // Sauvegarder le fichier
    await fs.writeFile(encadrantsFilePath, JSON.stringify(encadrantsData, null, 2));

    await logAction('ADD_ENCADRANT', { name, email, result: 'success' }, getAuthor(req));
    res.status(200).json({ 
      message: 'Encadrant ajouté/modifié avec succès.',
      encadrants: encadrantsData.encadrants 
    });
  } catch (error) {
    console.error('Error adding encadrant:', error);
    res.status(500).json({ error: 'Failed to add encadrant' });
  }
});

/**
 * Route API pour supprimer un brouillon.
 * Vérifie que le chemin est sécurisé (dans le répertoire drafts) avant de supprimer le fichier.
 * @route DELETE /api/drafts/:fileName
 * @param {express.Request} req - L'objet requête Express avec param : fileName (nom du fichier à supprimer)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès ou d'erreur
 */
app.delete('/api/drafts/:fileName', checkAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    const filePath = path.join(DRAFTS_DIR, fileName);

    // Security check: ensure the path is within the drafts directory
    if (path.dirname(filePath) !== DRAFTS_DIR) {
        return res.status(400).json({ message: 'Invalid file path.' });
    }

    await fs.unlink(filePath);
    await logAction('DELETE_DRAFT', { file: fileName, result: 'success' }, getAuthor(req));
    res.status(200).json({ message: `Draft ${fileName} deleted successfully.` });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Draft not found.' });
    }
    console.error('Error deleting draft:', error);
    await logAction('DELETE_DRAFT', { file: req.params.fileName, result: 'failure', error: error.message }, getAuthor(req));
    res.status(500).json({ message: 'Failed to delete draft.' });
  }
});

const multer = require('multer');
const validator = require('validator');
const UPLOADS_DIR = path.join(__dirname, 'blueprint_local', 'public', 'uploads');

// Types MIME autorisés
const ALLOWED_MIME_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'application/pdf': '.pdf'
};

// Taille maximale des fichiers (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Configure multer for file uploads avec sécurité
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Sanitizer le nom de fichier
    const ext = ALLOWED_MIME_TYPES[file.mimetype] || path.extname(file.originalname);
    const baseName = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const sanitizedName = validator.escape(baseName);
    cb(null, `${Date.now()}-${sanitizedName}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error(`Type de fichier non autorisé. Types acceptés: ${Object.keys(ALLOWED_MIME_TYPES).join(', ')}`));
    }
  }
});

/**
 * Route API pour téléverser un fichier (image, vidéo, PDF).
 * Utilise multer pour gérer l'upload et retourne le chemin relatif du fichier pour TinyMCE.
 * @route POST /api/upload
 * @param {express.Request} req - L'objet requête Express avec un fichier dans le body (multipart/form-data)
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec { location: string } (chemin relatif du fichier)
 */
app.post('/api/upload', checkAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier téléversé.' });
  }

  // Vérification supplémentaire du type MIME
  if (!ALLOWED_MIME_TYPES[req.file.mimetype]) {
    // Supprimer le fichier si le type n'est pas autorisé
    try {
      await fs.unlink(req.file.path);
    } catch (err) {
      console.error('Erreur lors de la suppression du fichier non autorisé:', err);
    }
    return res.status(400).json({ error: 'Type de fichier non autorisé.' });
  }

  // TinyMCE expects a JSON response with a 'location' property.
  // The path must be relative to the 'blueprint_local' static root.
  const filePath = `/public/uploads/${req.file.filename}`;
  await logAction('FILE_UPLOAD', { 
    file: req.file.filename, 
    path: filePath, 
    size: req.file.size,
    mimetype: req.file.mimetype,
    result: 'success' 
  }, getAuthor(req));
  res.json({ location: filePath });
});

/**
 * Route API pour récupérer tous les logs (admin uniquement).
 * Retourne tous les logs triés du plus récent au plus ancien.
 * @route GET /api/logs
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau de tous les logs
 */
app.get('/api/logs', checkAuth, async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'logs', 'backend-actions.json');
    const logs = JSON.parse(await fs.readFile(logFilePath, 'utf8'));

    // Reverse to show most recent first
    const reversedLogs = logs.reverse();

    res.json(reversedLogs);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If the log file doesn't exist yet, return an empty array
      return res.json([]);
    }
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs.' });
  }
});

/**
 * Route API pour récupérer l'historique des connexions (admin uniquement).
 * Filtre les logs pour ne retourner que les événements USER_LOGIN, triés du plus récent au plus ancien.
 * @route GET /api/logs/logins
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un tableau des événements de connexion
 */
app.get('/api/logs/logins', checkAuth, async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'logs', 'backend-actions.json');
    const logs = JSON.parse(await fs.readFile(logFilePath, 'utf8'));

    // Filter for login events and reverse to show most recent first
    const loginEvents = logs
      .filter(log => log.action === 'USER_LOGIN')
      .reverse();

    res.json(loginEvents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If the log file doesn't exist yet, return an empty array
      return res.json([]);
    }
    console.error('Error reading login logs:', error);
    res.status(500).json({ error: 'Failed to retrieve login history.' });
  }
});


/**
 * Route API pour sauvegarder la configuration des projets à la une (admin uniquement).
 * Écrit la configuration dans featured_projects.json.
 * @route POST /api/projects/featured
 * @param {express.Request} req - L'objet requête Express avec body : { featured: Array<{fileName: string, position: number}> }
 * @param {express.Response} res - L'objet réponse Express
 * @returns {Promise<void>} Réponse JSON avec un message de succès
 */
app.post('/api/projects/featured', checkAuth, async (req, res) => {
  try {
    const { featured } = req.body;
    if (!Array.isArray(featured)) {
      return res.status(400).json({ error: 'Invalid data format.' });
    }

    const featuredConfigPath = path.join(__dirname, 'featured_projects.json');
    const config = { featured: featured };

    await fs.writeFile(featuredConfigPath, JSON.stringify(config, null, 2));

    await logAction('UPDATE_FEATURED', { result: 'success' }, getAuthor(req));
    res.status(200).json({ message: 'Featured projects configuration saved.' });
  } catch (error) {
    console.error('Error saving featured projects config:', error);
    res.status(500).json({ error: 'Failed to save configuration.' });
  }
});

/**
 * Route API de test pour vérifier que le serveur fonctionne.
 * @route GET /api/status
 * @param {express.Request} req - L'objet requête Express
 * @param {express.Response} res - L'objet réponse Express
 * @returns {void} Réponse JSON avec { status: 'ok', message: string }
 */
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Welcome to the BluePrint API' });
});

/**
 * Route de health check pour le monitoring et les conteneurs
 * @route GET /api/health
 * @returns {Promise<void>} Réponse JSON avec le statut de l'application
 */
app.get('/api/health', async (req, res) => {
  try {
    // Vérifier que les répertoires essentiels existent
    await fs.access(DRAFTS_DIR);
    await fs.access(PUBLISHED_DIR);
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Service unavailable',
      error: error.message 
    });
  }
});

/*
// =================================================================
// START OF OPENID CONNECT AUTHENTICATION LOGIC
// =================================================================
// NOTE: This section is commented out to allow for simulated login.
// To enable OpenID Connect:
//   1. Create a `openid-config.js` file based on the example.
//   2. Uncomment this entire section.
//   3. Comment out the simulated login route (`/api/login`).
//   4. In `checkAuth`, comment out `res.redirect('/login.html')`
//      and uncomment `res.redirect('/login')`.
// =================================================================

let client;

async function initializeOpenID() {
  try {
    // Dynamically import openid-client (ESM) into this CommonJS module
    const { Issuer } = await import('openid-client');
    const openidConfig = require('./openid-config');

    const issuer = await Issuer.discover(openidConfig.issuer);

    client = new issuer.Client({
      client_id: openidConfig.client_id,
      client_secret: openidConfig.client_secret,
      redirect_uris: [openidConfig.redirect_uri],
      response_types: ['code'],
    });

    console.log('OpenID client discovered and configured.');
    return true; // Indicate success
  } catch (err) {
    console.error('Failed to initialize OpenID client:', err);
    console.error('OpenID authentication will be unavailable.');
    return false; // Indicate failure
  }
}

// OpenID Connect Routes
app.get('/login', (req, res) => {
  if (!client) return res.status(503).send('OpenID client not available.');
  const { nonce, state } = Issuer.generate();
  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = client.authorizationUrl({
    scope: openidConfig.scope,
    response_mode: 'form_post',
    nonce,
    state,
  });
  res.redirect(authUrl);
});

app.post('/auth/callback', async (req, res) => {
  if (!client) return res.status(503).send('OpenID client not available.');
  try {
    const params = client.callbackParams(req);
    const { nonce, state } = req.session;
    delete req.session.nonce;
    delete req.session.state;

    const tokenSet = await client.callback(openidConfig.redirect_uri, params, { nonce, state });
    const claims = tokenSet.claims();

    req.session.user = {
      id: claims.sub,
      name: claims.name,
      email: claims.email,
    };
    req.session.id_token = tokenSet.id_token;

    res.redirect('/intranet/editor.html');
  } catch (err) {
    console.error('Callback error:', err);
    res.status(400).send('Authentication failed');
  }
});

app.get('/logout', (req, res) => {
  if (!client) return res.status(503).send('OpenID client not available.');
  const id_token = req.session.id_token;
  delete req.session.id_token;
  req.session.destroy(err => {
    if (err) console.error('Failed to destroy session:', err);
    const endSessionUrl = client.endSessionUrl({
      id_token_hint: id_token,
      post_logout_redirect_uri: 'http://localhost:3000',
    });
    res.redirect(endSessionUrl);
  });
});

// =================================================================
// END OF OPENID CONNECT AUTHENTICATION LOGIC
// =================================================================
*/

/**
 * Fonction de démarrage du serveur Express.
 * Initialise le serveur sur le port configuré (défaut: 3000).
 * @returns {Promise<void>}
 */
async function startServer() {
  // Uncomment the line below to enable OpenID initialization
  // await initializeOpenID();

  app.listen(port, '0.0.0.0', () => {
    console.log(`BluePrint server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`Accessible via: ${process.env.BASE_URL || 'https://blueprintlab.mde.epf.fr'}`);
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;