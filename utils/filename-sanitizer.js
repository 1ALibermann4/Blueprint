/**
 * Utilitaires pour la sanitization et la gestion des noms de fichiers
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Normalise les caractères accentués vers leur équivalent ASCII
 * @param {string} str - Chaîne à normaliser
 * @returns {string} - Chaîne normalisée
 */
function normalizeAccents(str) {
    const accents = {
        'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
        'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
        'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
        'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
        'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
        'ý': 'y', 'ÿ': 'y',
        'ç': 'c', 'ñ': 'n',
        'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
        'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
        'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
        'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
        'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
        'Ý': 'Y', 'Ÿ': 'Y',
        'Ç': 'C', 'Ñ': 'N'
    };
    
    return str.replace(/[àáâãäåèéêëìíîïòóôõöùúûüýÿçñÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÇÑ]/g, char => accents[char] || char);
}

/**
 * Sanitize un titre pour créer un nom de fichier sûr
 * @param {string} titre - Le titre à sanitizer
 * @returns {string} - Nom de fichier sanitizé
 */
function sanitizeFilename(titre) {
    if (!titre || typeof titre !== 'string') {
        return 'sans_titre';
    }
    
    // Normaliser les accents
    let sanitized = normalizeAccents(titre);
    
    // Remplacer les espaces et caractères spéciaux par des underscores
    sanitized = sanitized.replace(/[^a-z0-9]/gi, '_');
    
    // Supprimer les underscores multiples
    sanitized = sanitized.replace(/_+/g, '_');
    
    // Supprimer les underscores en début et fin
    sanitized = sanitized.replace(/^_+|_+$/g, '');
    
    // Convertir en minuscules
    sanitized = sanitized.toLowerCase();
    
    // Limiter la longueur (max 100 caractères pour éviter les problèmes de système de fichiers)
    if (sanitized.length > 100) {
        sanitized = sanitized.substring(0, 100);
    }
    
    // Si vide après sanitization, utiliser un nom par défaut
    if (!sanitized) {
        sanitized = 'sans_titre';
    }
    
    return sanitized;
}

/**
 * Vérifie si un fichier existe déjà dans un répertoire
 * @param {string} dir - Répertoire à vérifier
 * @param {string} baseName - Nom de base du fichier (sans extension)
 * @param {string} extension - Extension du fichier (avec point, ex: '.md')
 * @returns {Promise<boolean>} - True si le fichier existe
 */
async function fileExists(dir, baseName, extension) {
    try {
        const fileName = `${baseName}${extension}`;
        const filePath = path.join(dir, fileName);
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Génère un nom de fichier unique en ajoutant un suffixe numérique si nécessaire
 * @param {string} dir - Répertoire où créer le fichier
 * @param {string} baseName - Nom de base (déjà sanitizé)
 * @param {string} extension - Extension (ex: '.md')
 * @param {string} excludeFile - Nom de fichier à exclure de la vérification (pour les mises à jour)
 * @returns {Promise<string>} - Nom de fichier unique (sans extension)
 */
async function generateUniqueFilename(dir, baseName, extension, excludeFile = null) {
    // Vérifier si le nom de base est disponible
    const baseExists = await fileExists(dir, baseName, extension);
    
    if (!baseExists || (excludeFile && `${baseName}${extension}` === excludeFile)) {
        return baseName;
    }
    
    // Chercher un nom disponible en ajoutant un suffixe numérique
    let counter = 1;
    let uniqueName = `${baseName}_${counter}`;
    
    while (await fileExists(dir, uniqueName, extension)) {
        // Si c'est le fichier qu'on exclut, on peut l'utiliser
        if (excludeFile && `${uniqueName}${extension}` === excludeFile) {
            return uniqueName;
        }
        counter++;
        uniqueName = `${baseName}_${counter}`;
        
        // Sécurité : éviter les boucles infinies
        if (counter > 1000) {
            // Utiliser un timestamp si trop de collisions
            uniqueName = `${baseName}_${Date.now()}`;
            break;
        }
    }
    
    return uniqueName;
}

/**
 * Crée un nom de fichier unique à partir d'un titre
 * @param {string} titre - Le titre du projet
 * @param {string} dir - Répertoire où créer le fichier
 * @param {string} extension - Extension du fichier (ex: '.md')
 * @param {string} currentFile - Nom du fichier actuel (pour les mises à jour, optionnel)
 * @returns {Promise<string>} - Nom de fichier unique complet (avec extension)
 */
async function createUniqueFilename(titre, dir, extension = '.md', currentFile = null) {
    // Sanitizer le titre
    const sanitized = sanitizeFilename(titre);
    
    // Générer un nom unique
    const uniqueBase = await generateUniqueFilename(dir, sanitized, extension, currentFile);
    
    return `${uniqueBase}${extension}`;
}

module.exports = {
    normalizeAccents,
    sanitizeFilename,
    fileExists,
    generateUniqueFilename,
    createUniqueFilename
};

