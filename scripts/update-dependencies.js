#!/usr/bin/env node

/**
 * Script pour mettre à jour les dépendances du projet de manière sécurisée
 * Vérifie les mises à jour disponibles et les applique avec confirmation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

/**
 * Exécute une commande shell et retourne le résultat.
 * @param {string} command - La commande à exécuter
 * @param {object} options - Options d'exécution : { silent: boolean } pour masquer la sortie
 * @returns {string} - La sortie de la commande
 * @throws {Error} Si l'exécution de la commande échoue
 */
function execCommand(command, options = {}) {
    try {
        return execSync(command, { 
            encoding: 'utf8', 
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options 
        });
    } catch (error) {
        if (!options.silent) {
            console.error(`Erreur lors de l'exécution: ${command}`);
            console.error(error.message);
        }
        throw error;
    }
}

/**
 * Vérifie les mises à jour disponibles pour les dépendances npm.
 * Utilise 'npm outdated' pour détecter les packages obsolètes.
 * @returns {object|null} - Un objet avec les packages obsolètes ou null si tout est à jour
 */
function checkUpdates() {
    console.log('🔍 Vérification des mises à jour disponibles...\n');
    
    try {
        // Vérifier les mises à jour avec npm outdated
        const outdated = execCommand('npm outdated --json', { silent: true });
        const outdatedPackages = JSON.parse(outdated);
        
        if (Object.keys(outdatedPackages).length === 0) {
            console.log('✅ Toutes les dépendances sont à jour !\n');
            return null;
        }
        
        console.log('📦 Packages obsolètes trouvés:\n');
        for (const [packageName, info] of Object.entries(outdatedPackages)) {
            console.log(`  ${packageName}:`);
            console.log(`    Actuel: ${info.current}`);
            console.log(`    Désiré: ${info.wanted}`);
            console.log(`    Dernier: ${info.latest}`);
            console.log('');
        }
        
        return outdatedPackages;
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des mises à jour:', error.message);
        return null;
    }
}

/**
 * Vérifie les vulnérabilités de sécurité dans les dépendances.
 * Utilise 'npm audit' pour détecter les vulnérabilités connues.
 * @returns {void}
 */
function checkVulnerabilities() {
    console.log('🔒 Vérification des vulnérabilités de sécurité...\n');
    
    try {
        execCommand('npm audit', { silent: false });
    } catch (error) {
        console.log('\n⚠️  Des vulnérabilités ont été détectées.');
        console.log('   Utilisez "npm audit fix" pour les corriger automatiquement.\n');
    }
}

/**
 * Met à jour les dépendances selon le mode spécifié.
 * @param {string} mode - Le mode de mise à jour : 'patch' (patches uniquement), 'minor' (mineures et patches), 'major' (nécessite attention manuelle), 'audit' (corrige les vulnérabilités)
 * @returns {void}
 */
function updateDependencies(mode = 'patch') {
    console.log(`\n🔄 Mise à jour des dépendances (mode: ${mode})...\n`);
    
    const modes = {
        'patch': 'npm update', // Mises à jour de patch uniquement
        'minor': 'npm update', // Mises à jour mineures et patches
        'major': 'npm install package@latest', // Toutes les mises à jour (manuel)
        'audit': 'npm audit fix' // Corriger les vulnérabilités
    };
    
    if (mode === 'audit') {
        try {
            execCommand(modes.audit);
            console.log('\n✅ Vulnérabilités corrigées !\n');
        } catch (error) {
            console.error('\n❌ Erreur lors de la correction des vulnérabilités:', error.message);
        }
        return;
    }
    
    if (mode === 'major') {
        console.log('⚠️  Les mises à jour majeures nécessitent une attention particulière.');
        console.log('   Veuillez mettre à jour manuellement les packages majeurs si nécessaire.\n');
        return;
    }
    
    try {
        execCommand(modes[mode] || modes.patch);
        console.log('\n✅ Mise à jour terminée !\n');
        
        // Vérifier à nouveau les vulnérabilités après mise à jour
        checkVulnerabilities();
    } catch (error) {
        console.error('\n❌ Erreur lors de la mise à jour:', error.message);
    }
}

/**
 * Crée une sauvegarde du package.json avec un timestamp.
 * @returns {string|null} - Le chemin du fichier de sauvegarde créé, ou null en cas d'erreur
 */
function backupPackageJson() {
    const backupPath = `${packageJsonPath}.backup.${Date.now()}`;
    try {
        fs.copyFileSync(packageJsonPath, backupPath);
        console.log(`💾 Sauvegarde créée: ${path.basename(backupPath)}\n`);
        return backupPath;
    } catch (error) {
        console.error('❌ Erreur lors de la création de la sauvegarde:', error.message);
        return null;
    }
}

/**
 * Fonction principale du script de mise à jour des dépendances.
 * Analyse les arguments de la ligne de commande et exécute la commande correspondante.
 * Commandes disponibles : 'check' (par défaut), 'update', 'audit-fix', 'help'.
 * @returns {void}
 */
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'check';
    
    console.log('📦 Gestionnaire de mise à jour des dépendances BluePrint\n');
    console.log('='.repeat(50) + '\n');
    
    switch (command) {
        case 'check':
            checkUpdates();
            checkVulnerabilities();
            break;
            
        case 'update':
        case 'patch':
            const backup = backupPackageJson();
            updateDependencies('patch');
            if (backup) {
                console.log(`💡 Pour restaurer: cp ${path.basename(backup)} package.json\n`);
            }
            break;
            
        case 'audit-fix':
            backupPackageJson();
            updateDependencies('audit');
            break;
            
        case 'help':
            console.log('Usage: node scripts/update-dependencies.js [command]\n');
            console.log('Commandes disponibles:');
            console.log('  check      - Vérifier les mises à jour disponibles (par défaut)');
            console.log('  update     - Mettre à jour les dépendances (patches et mineures)');
            console.log('  audit-fix  - Corriger les vulnérabilités de sécurité');
            console.log('  help       - Afficher cette aide\n');
            break;
            
        default:
            console.log(`❌ Commande inconnue: ${command}\n`);
            console.log('Utilisez "help" pour voir les commandes disponibles.\n');
    }
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = { checkUpdates, updateDependencies, checkVulnerabilities };

