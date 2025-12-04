const fs = require('fs').promises;
const path = require('path');
const { rotateLog } = require('./utils/log-rotator');

const LOG_FILE = path.join(__dirname, 'logs', 'backend-actions.json');
const MAX_LOG_SIZE = process.env.MAX_LOG_SIZE ? parseInt(process.env.MAX_LOG_SIZE) : 10 * 1024 * 1024; // 10 MB par défaut

/**
 * S'assure que le répertoire de logs existe.
 * Crée le répertoire de manière récursive s'il n'existe pas.
 * @returns {Promise<void>}
 * @throws {Error} Si la création du répertoire échoue
 */
async function ensureLogDir() {
    try {
        await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    } catch (error) {
        console.error("Could not create log directory:", error);
    }
}

/**
 * Enregistre une action dans un fichier JSON avec support de rotation.
 * Effectue la rotation automatique si le fichier dépasse MAX_LOG_SIZE.
 * Limite le nombre d'entrées en mémoire à 1000 pour éviter la saturation.
 * @param {string} action - Le type d'action (ex: 'SAVE_DRAFT', 'USER_LOGIN', 'PUBLISH_PROJECT')
 * @param {object} data - Les données associées à l'action
 * @param {object} author - L'auteur de l'action { name: string, sessionId?: string }
 * @returns {Promise<void>}
 */
async function logAction(action, data, author = null) {
    await ensureLogDir();

    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        author: author || { name: 'system', sessionId: null },
        data: data
    };

    try {
        // Vérifier et effectuer la rotation si nécessaire
        await rotateLog(LOG_FILE, MAX_LOG_SIZE);

        // Read the existing log file (peut être nouveau après rotation)
        let logs = [];
        try {
            const currentLogs = await fs.readFile(LOG_FILE, 'utf8');
            logs = JSON.parse(currentLogs);
            // S'assurer que c'est un tableau
            if (!Array.isArray(logs)) {
                logs = [];
            }
        } catch (error) {
            // If the file doesn't exist, it's fine, we'll create it.
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // Add the new entry
        logs.push(logEntry);
        
        // Limiter le nombre d'entrées en mémoire (garder les 1000 dernières)
        if (logs.length > 1000) {
            logs = logs.slice(-1000);
        }

        // Write back to the file
        await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

module.exports = { logAction };
