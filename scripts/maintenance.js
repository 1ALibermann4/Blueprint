#!/usr/bin/env node

/**
 * Script de maintenance périodique pour BluePrint
 * À exécuter quotidiennement via cron ou scheduler
 */

const { cleanOldLogs } = require('../utils/log-rotator');
const path = require('path');

const LOG_DIR = path.join(__dirname, '..', 'logs');
const MAX_LOG_AGE_DAYS = 30; // Conserver les logs de moins de 30 jours

/**
 * Nettoie les logs anciens (plus de MAX_LOG_AGE_DAYS jours).
 * Appelle cleanOldLogs() pour supprimer les fichiers de log dépassant l'âge maximum.
 * @returns {Promise<void>}
 */
async function cleanupLogs() {
    console.log('🧹 Nettoyage des logs anciens...');
    try {
        await cleanOldLogs(LOG_DIR, MAX_LOG_AGE_DAYS);
        console.log('✅ Nettoyage des logs terminé\n');
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage des logs:', error.message);
    }
}

/**
 * Vérifie l'espace disque utilisé par les logs.
 * Calcule la taille totale de tous les fichiers .json dans le répertoire de logs
 * et affiche un avertissement si la taille dépasse 100 MB.
 * @returns {Promise<void>}
 */
async function checkLogSize() {
    const fs = require('fs').promises;
    try {
        const files = await fs.readdir(LOG_DIR);
        let totalSize = 0;
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(LOG_DIR, file);
                const stats = await fs.stat(filePath);
                totalSize += stats.size;
            }
        }
        
        const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`📊 Taille totale des logs: ${sizeMB} MB\n`);
        
        if (totalSize > 100 * 1024 * 1024) { // > 100 MB
            console.log('⚠️  Attention: Les logs occupent plus de 100 MB');
            console.log('   Considérez augmenter la fréquence de nettoyage\n');
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification de la taille:', error.message);
    }
}

/**
 * Fonction principale du script de maintenance.
 * Exécute toutes les tâches de maintenance : nettoyage des logs et vérification de la taille.
 * @returns {Promise<void>}
 */
async function main() {
    console.log('🔧 Maintenance BluePrint\n');
    console.log('='.repeat(50) + '\n');
    
    await cleanupLogs();
    await checkLogSize();
    
    console.log('✅ Maintenance terminée\n');
}

// Exécuter si appelé directement
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Erreur fatale:', error);
        process.exit(1);
    });
}

module.exports = { cleanupLogs, checkLogSize };

