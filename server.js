const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const { logAction } = require('./logger');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies, which will be used for API requests.
app.use(express.json());

app.use(session({
  secret: 'a-secure-secret-key', // In production, use an environment variable
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // In production, set to true and use HTTPS
}));

// Middleware to protect routes
const checkAuth = (req, res, next) => {
  // AUTHENTICATION DISABLED: No check, all requests are allowed.
  next();
};

// Serve static files from the 'blueprint_local' directory
app.use(express.static(path.join(__dirname, 'blueprint_local')));

// Protect the 'intranet' and 'admin' directories
app.use('/intranet', checkAuth);
app.use('/admin', checkAuth);

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');
const PUBLISHED_DIR = path.join(__dirname, 'blueprint_local', 'public', 'projects', 'published');
const PUBLISHED_MD_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'published_md');


// API route for simulated login
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // Create a user session
    req.session.user = { name: username };

    // Log the login event
    await logAction('USER_LOGIN', { data: { user: username, result: 'success' } });

    res.status(200).json({ message: 'Login successful.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

// Helper function to list project files in a directory
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

// API route to list draft projects with sorting and filtering
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

// API route for students to list all their drafts, regardless of status
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

// API route to list published projects with sorting and filtering
app.get('/api/projects/published', async (req, res) => {
  try {
    const { sortBy, tag } = req.query;

    // We now read from the directory containing the Markdown files of published projects
    const files = await fs.readdir(PUBLISHED_MD_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    let projects = await Promise.all(mdFiles.map(async file => {
      const filePath = path.join(PUBLISHED_MD_DIR, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const { data } = matter(fileContent);
      return {
        // We return the .html version of the file for the link
        fileName: file.replace('.md', '.html'),
        titre: data.titre,
        tags: data.tags || [],
        dateModification: data.dateModification
      };
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
    console.error('Error listing published projects:', error);
    res.status(500).json({ error: 'Failed to list published projects' });
  }
});

// API route to get the project template
app.get('/api/templates/project', checkAuth, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'blueprint_local', 'public', 'templates', 'page_projet.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Extract only the content within the <body> tag
    const bodyContentMatch = templateContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const extractedContent = bodyContentMatch ? bodyContentMatch[1] : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(extractedContent);
  } catch (error) {
    console.error('Error reading project template:', error);
    res.status(500).json({ error: 'Failed to read project template' });
  }
});

// API route to get the full project template for review purposes
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

// API route to get a single project's content (Markdown container version)
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

    // Send the parsed front matter (for the title) and the HTML content back
    res.json({ frontMatter: data, content: content });
  } catch (error) {
    console.error('Error reading project file:', error);
    res.status(500).json({ error: 'Failed to read project file' });
  }
});

// API route to create or update a draft project (Markdown container version)
app.post('/api/drafts', checkAuth, async (req, res) => {
  try {
    const { titre, content, tags, currentFile } = req.body;

    if (!titre) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Sanitize the title to create a safe filename with .md extension.
    const newFileName = `${titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
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

    // Create front matter with dates, tags, and status
    const frontMatter = {
      titre: titre,
      tags: tags || [],
      status: 'draft', // Default status for new drafts
      dateCreation: dateCreation,
      dateModification: new Date().toISOString()
    };
    const fileContent = matter.stringify(content || '', frontMatter);

    await fs.mkdir(DRAFTS_DIR, { recursive: true });
    await fs.writeFile(newFilePath, fileContent);

    await logAction('SAVE_DRAFT', { file: newFileName, result: 'success' });
    res.status(201).json({ message: 'Draft saved successfully', file: newFileName });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// API route to submit a draft for review
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

    await logAction('SUBMIT_FOR_REVIEW', { file, result: 'success' });
    res.status(200).json({ message: 'Draft submitted for review successfully' });

  } catch (error) {
    console.error('Error submitting draft for review:', error);
    res.status(500).json({ error: 'Failed to submit draft for review' });
  }
});

// API route to reject a draft
app.post('/api/reject_draft', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const filePath = path.join(DRAFTS_DIR, file);

    // Read, update status, and write back
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data: frontMatter, content } = matter(fileContent);

    frontMatter.status = 'rejected';
    frontMatter.dateModification = new Date().toISOString();

    const updatedFileContent = matter.stringify(content, frontMatter);
    await fs.writeFile(filePath, updatedFileContent);

    await logAction('REJECT_DRAFT', { file, result: 'success' });
    res.status(200).json({ message: 'Draft rejected successfully' });

  } catch (error) {
    console.error('Error rejecting draft:', error);
    res.status(500).json({ error: 'Failed to reject draft' });
  }
});

// API route to publish a project
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

    // 3. Replace the template's title and body content
    let finalHtml = templateContent.replace(/<title>.*<\/title>/i, `<title>${frontMatter.titre} - BluePrint</title>`);
    finalHtml = finalHtml.replace(/<body[^>]*>[\s\S]*<\/body>/i, `<body>${draftHtmlContent}</body>`);


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

    await logAction('PUBLISH_PROJECT', { file: htmlFileName, result: 'success' });
    res.json({ message: `Project ${htmlFileName} published successfully` });
  } catch (error) {
    console.error('Error publishing project:', error);
    res.status(500).json({ error: 'Failed to publish project' });
  }
});

// API route for deleting a draft
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
    await logAction('DELETE_DRAFT', { file: fileName, result: 'success' });
    res.status(200).json({ message: `Draft ${fileName} deleted successfully.` });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Draft not found.' });
    }
    console.error('Error deleting draft:', error);
    await logAction('DELETE_DRAFT', { file: req.params.fileName, result: 'failure', error: error.message });
    res.status(500).json({ message: 'Failed to delete draft.' });
  }
});

const multer = require('multer');
const UPLOADS_DIR = path.join(__dirname, 'blueprint_local', 'public', 'uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Use the original file name, but you might want to sanitize it
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// API route for file uploads
app.post('/api/upload', checkAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // TinyMCE expects a JSON response with a 'location' property.
  const filePath = `/uploads/${req.file.filename}`;
  await logAction('FILE_UPLOAD', { file: req.file.filename, path: filePath, result: 'success' });
  res.json({ location: filePath });
});

// API route to get login history
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


// A simple test route to confirm the server is running.
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Welcome to the BluePrint API' });
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

// --- Server Startup ---
async function startServer() {
  // Uncomment the line below to enable OpenID initialization
  // await initializeOpenID();

  app.listen(port, () => {
    console.log(`BluePrint server is running on http://localhost:${port}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;