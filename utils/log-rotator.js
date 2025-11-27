/**
 * Système de rotation des logs pour éviter qu'ils ne deviennent trop volumineux
 */

const fs = require('fs').promises;
const path = require('path');

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB par défaut
const DEFAULT_MAX_FILES = 5; // Garder 5 fichiers de log maximum
const DEFAULT_LOG_DIR = path.join(__dirname, '..', 'logs');

/**
 * S'assure que le répertoire de logs existe
 * @param {string} logDir - Répertoire des logs
 */
async function ensureLogDir(logDir) {
    try {
        await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
        // Ignorer si le répertoire existe déjà
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

/**
 * Vérifie la taille d'un fichier
 * @param {string} filePath - Chemin du fichier
 * @returns {Promise<number>} - Taille en octets
 */
async function getFileSize(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return 0;
        }
        throw error;
    }
}

/**
 * Supprime les anciens fichiers de log
 * @param {string} logDir - Répertoire des logs
 * @param {string} baseName - Nom de base du fichier de log (ex: 'backend-actions')
 * @param {number} maxFiles - Nombre maximum de fichiers à garder
 */
async function removeOldLogs(logDir, baseName, maxFiles) {
    try {
        const files = await fs.readdir(logDir);
        
        // Filtrer les fichiers de log correspondants
        const logFiles = files
            .filter(file => file.startsWith(baseName) && file.endsWith('.json'))
            .map(file => ({
                name: file,
                path: path.join(logDir, file),
                // Extraire le numéro de rotation si présent
                rotation: file.match(/\d+$/) ? parseInt(file.match(/\d+$/)[0]) : 0
            }))
            .sort((a, b) => b.rotation - a.rotation); // Plus récent en premier
        
        // Supprimer les fichiers en trop
        if (logFiles.length > maxFiles) {
            const filesToDelete = logFiles.slice(maxFiles);
            for (const file of filesToDelete) {
                try {
                    await fs.unlink(file.path);
                    console.log(`Ancien log supprimé: ${file.name}`);
                } catch (error) {
                    console.error(`Erreur lors de la suppression de ${file.name}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Erreur lors du nettoyage des anciens logs:', error);
    }
}

/**
 * Effectue la rotation d'un fichier de log
 * @param {string} logFilePath - Chemin du fichier de log
 * @param {number} maxSize - Taille maximale en octets avant rotation
 * @param {number} maxFiles - Nombre maximum de fichiers à garder
 * @returns {Promise<boolean>} - True si une rotation a été effectuée
 */
async function rotateLog(logFilePath, maxSize = DEFAULT_MAX_SIZE, maxFiles = DEFAULT_MAX_FILES) {
    try {
        const logDir = path.dirname(logFilePath);
        await ensureLogDir(logDir);
        
        const fileSize = await getFileSize(logFilePath);
        
        // Si le fichier n'a pas atteint la taille maximale, pas besoin de rotation
        if (fileSize < maxSize) {
            return false;
        }
        
        const baseName = path.basename(logFilePath, '.json');
        
        // Trouver le prochain numéro de rotation
        const files = await fs.readdir(logDir);
        const existingRotations = files
            .filter(file => file.startsWith(`${baseName}.`) && file.endsWith('.json'))
            .map(file => {
                const match = file.match(/\.(\d+)\.json$/);
                return match ? parseInt(match[1]) : 0;
            });
        
        const nextRotation = existingRotations.length > 0 
            ? Math.max(...existingRotations) + 1 
            : 1;
        
        // Renommer le fichier actuel avec le numéro de rotation
        const rotatedPath = path.join(logDir, `${baseName}.${nextRotation}.json`);
        await fs.rename(logFilePath, rotatedPath);
        
        console.log(`Log roté: ${path.basename(logFilePath)} -> ${path.basename(rotatedPath)}`);
        
        // Supprimer les anciens fichiers
        await removeOldLogs(logDir, baseName, maxFiles);
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la rotation du log:', error);
        return false;
    }
}

/**
 * Nettoie les logs anciens (plus de X jours)
 * @param {string} logDir - Répertoire des logs
 * @param {number} maxAgeDays - Âge maximum en jours
 */
async function cleanOldLogs(logDir, maxAgeDays = 30) {
    try {
        const files = await fs.readdir(logDir);
        const now = Date.now();
        const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
        
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            
            const filePath = path.join(logDir, file);
            try {
                const stats = await fs.stat(filePath);
                const age = now - stats.mtime.getTime();
                
                if (age > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Log ancien supprimé: ${file} (${Math.floor(age / (24 * 60 * 60 * 1000))} jours)`);
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification de ${file}:`, error);
            }
        }
    } catch (error) {
        console.error('Erreur lors du nettoyage des logs anciens:', error);
    }
}

module.exports = {
    rotateLog,
    cleanOldLogs,
    getFileSize,
    DEFAULT_MAX_SIZE,
    DEFAULT_MAX_FILES
};

