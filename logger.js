const fs = require('fs').promises;
const path = require('path');

const LOG_FILE = path.join(__dirname, 'logs', 'backend-actions.json');

/**
 * Ensures the log directory exists.
 */
async function ensureLogDir() {
    try {
        await fs.mkdir(path.dirname(LOG_FILE), { recursive: true });
    } catch (error) {
        console.error("Could not create log directory:", error);
    }
}

/**
 * Logs an action to a JSON file.
 * @param {string} action - The type of action (e.g., 'SAVE_DRAFT').
 * @param {object} data - The data associated with the action.
 */
async function logAction(action, data) {
    await ensureLogDir();

    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        data: data
    };

    try {
        // Read the existing log file
        let logs = [];
        try {
            const currentLogs = await fs.readFile(LOG_FILE, 'utf8');
            logs = JSON.parse(currentLogs);
        } catch (error) {
            // If the file doesn't exist, it's fine, we'll create it.
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }

        // Add the new entry and write back to the file
        logs.push(logEntry);
        await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2));

    } catch (error) {
        console.error('Failed to write to log file:', error);
    }
}

module.exports = { logAction };
