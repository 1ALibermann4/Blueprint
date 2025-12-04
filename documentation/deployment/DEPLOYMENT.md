# Documentation de Déploiement - BluePrint

Ce document explique comment déployer et lancer l'application BluePrint sur un serveur local du réseau de l'école.

> **Note** : Ce déploiement est conçu pour un environnement local/réseau interne. Les fonctionnalités de reverse proxy et SSL/HTTPS pourront être ajoutées dans le cadre des projets étudiants de l'année prochaine.

## Table des Matières

1. [Prérequis](#1-prérequis)
2. [Installation](#2-installation)
3. [Configuration](#3-configuration)
4. [Démarrage](#4-démarrage)
5. [Production avec PM2](#5-production-avec-pm2)
6. [Accès sur le Réseau Local](#6-accès-sur-le-réseau-local)
7. [Sécurité (Réseau Local)](#7-sécurité-réseau-local)
8. [Maintenance](#8-maintenance)
9. [Évolutions Futures (Projets Étudiants)](#9-évolutions-futures-projets-étudiants)

## 1. Prérequis

### Logiciels Requis

- **Node.js** : Version 16.x ou supérieure
  ```bash
  node -v  # Vérifier la version
  ```
- **npm** : Généralement inclus avec Node.js
  ```bash
  npm -v  # Vérifier la version
  ```
- **Git** : Pour cloner le dépôt (optionnel)

### Serveur

- Système d'exploitation : Linux (recommandé), Windows Server, ou macOS
- RAM : Minimum 512 MB, recommandé 1 GB+
- Espace disque : Minimum 500 MB pour l'application + espace pour les projets

## 2. Installation

### 2.1 Cloner le Projet

```bash
git clone https://github.com/1ALibermann4/Blueprint.git
cd Blueprint
```

### 2.2 Installer les Dépendances

```bash
npm install --production
```

> **Note** : L'option `--production` installe uniquement les dépendances nécessaires pour la production (sans les devDependencies).

### 2.3 Vérifier la Structure

Assurez-vous que les répertoires suivants existent :
- `blueprint_local/intranet/projects/drafts/`
- `blueprint_local/public/projects/published/`
- `blueprint_local/public/uploads/`

Créez-les si nécessaire :
```bash
mkdir -p blueprint_local/intranet/projects/drafts
mkdir -p blueprint_local/public/projects/published
mkdir -p blueprint_local/public/uploads
```

## 3. Configuration

### 3.1 Configuration OpenID Connect (Optionnel)

Si votre école dispose d'un fournisseur OpenID Connect, vous pouvez configurer l'authentification.

1. Créez le fichier `openid-config.js` à la racine du projet :

```bash
cp openid-config.js.example openid-config.js
```

2. Éditez `openid-config.js` avec vos identifiants :

```javascript
module.exports = {
  issuer: 'https://votre-fournisseur-openid.com',
  client_id: 'VOTRE_CLIENT_ID',
  client_secret: 'VOTRE_CLIENT_SECRET',
  redirect_uri: 'http://IP_DU_SERVEUR:3000/auth/callback', // Adresse IP ou nom d'hôte du serveur
  scope: 'openid profile email'
};
```

> **Note** : 
> - Le `redirect_uri` doit correspondre à l'adresse IP ou au nom d'hôte de votre serveur sur le réseau local
> - Ne commitez jamais `openid-config.js` dans Git (déjà dans `.gitignore`)
> - Si OpenID Connect n'est pas configuré, l'authentification simulée sera utilisée

### 3.2 Configuration du Secret de Session

Pour un environnement de production, modifiez le secret de session dans `server.js` :

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // false pour HTTP (réseau local)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));
```

Générez un secret sécurisé :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.3 Variables d'Environnement (Optionnel)

Créez un fichier `.env` (non versionné) :

```bash
PORT=3000
NODE_ENV=production
SESSION_SECRET=votre-secret-genere
BASE_URL=http://IP_DU_SERVEUR:3000
```

Installez `dotenv` si vous souhaitez utiliser les variables d'environnement :
```bash
npm install dotenv
```

Puis ajoutez au début de `server.js` :
```javascript
require('dotenv').config();
```

## 4. Démarrage

### 4.1 Démarrage Simple

```bash
npm start
```

L'application sera accessible sur `http://localhost:3000` (ou le port configuré).

### 4.2 Vérification

Testez les endpoints :
- Page d'accueil : `http://localhost:3000/page_accueil.html`
- Liste des projets : `http://localhost:3000/public/project_list.html`
- Intranet : `http://localhost:3000/intranet/brouillons.html`
- Admin : `http://localhost:3000/admin/validate.html`

## 5. Production avec PM2

PM2 est un gestionnaire de processus pour Node.js qui permet de maintenir l'application en fonctionnement continu.

### 5.1 Installation de PM2

```bash
npm install -g pm2
```

### 5.2 Démarrage avec PM2

```bash
pm2 start server.js --name "blueprint-app"
```

### 5.3 Commandes PM2 Utiles

```bash
# Voir les processus
pm2 list

# Voir les logs
pm2 logs blueprint-app

# Redémarrer l'application
pm2 restart blueprint-app

# Arrêter l'application
pm2 stop blueprint-app

# Supprimer l'application
pm2 delete blueprint-app

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique au boot
pm2 startup
```

### 5.4 Fichier de Configuration PM2 (Optionnel)

Créez `ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'blueprint-app',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

Puis démarrez avec :
```bash
pm2 start ecosystem.config.js
```

## 6. Accès sur le Réseau Local

### 6.1 Configuration du Port

Par défaut, l'application écoute sur le port 3000. Pour changer le port, modifiez la variable `port` dans `server.js` ou utilisez une variable d'environnement :

```bash
PORT=8080 npm start
```

### 6.2 Accès depuis d'Autres Machines

Une fois le serveur démarré, l'application est accessible depuis n'importe quelle machine du réseau local via :

```
http://IP_DU_SERVEUR:3000
```

Pour trouver l'adresse IP du serveur :
- **Linux** : `ip addr` ou `ifconfig`
- **Windows** : `ipconfig`

### 6.3 Firewall (si nécessaire)

Si un firewall est actif, ouvrez le port utilisé (par défaut 3000) :

**Linux (ufw)** :
```bash
sudo ufw allow 3000/tcp
```

**Windows** :
- Ouvrir le Pare-feu Windows
- Ajouter une règle de port entrant pour le port 3000

### 6.4 Configuration OpenID Connect pour Réseau Local

Dans `openid-config.js`, configurez l'URL de redirection avec l'adresse IP ou le nom d'hôte du serveur :

```javascript
module.exports = {
  issuer: 'https://votre-fournisseur-openid.com',
  client_id: 'VOTRE_CLIENT_ID',
  client_secret: 'VOTRE_CLIENT_SECRET',
  redirect_uri: 'http://IP_DU_SERVEUR:3000/auth/callback', // ou http://nom-serveur:3000/auth/callback
  scope: 'openid profile email'
};
```

## 7. Sécurité (Réseau Local)

### 7.1 Checklist de Sécurité pour Réseau Interne

- [ ] OpenID Connect configuré (si disponible)
- [ ] Secret de session fort et unique
- [ ] Accès restreint au réseau local uniquement
- [ ] Firewall configuré pour limiter l'accès
- [ ] Logs activés et surveillés
- [ ] Sauvegardes régulières des projets
- [ ] Limitation de taille des uploads

### 7.2 Limitation de Taille des Uploads

Dans `server.js`, configurez Multer :
```javascript
const upload = multer({
  dest: 'blueprint_local/public/uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB max
  }
});
```

### 7.3 Note sur HTTPS/SSL

Pour un déploiement en production sur Internet, HTTPS et un reverse proxy seront nécessaires. Ces fonctionnalités pourront être ajoutées dans le cadre des projets étudiants de l'année prochaine.

## 8. Maintenance

### 8.1 Sauvegardes

Créez un script de sauvegarde (`backup.sh`) :

```bash
#!/bin/bash
BACKUP_DIR="/backups/blueprint"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarder les projets
tar -czf $BACKUP_DIR/projects_$DATE.tar.gz blueprint_local/intranet/projects/ blueprint_local/public/projects/

# Sauvegarder les uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz blueprint_local/public/uploads/

# Sauvegarder les fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz available_tags.json featured_projects.json openid-config.js

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -type f -mtime +30 -delete
```

Planifiez avec cron :
```bash
0 2 * * * /chemin/vers/backup.sh
```

### 8.2 Monitoring

- Surveillez les logs : `pm2 logs blueprint-app`
- Surveillez l'utilisation des ressources : `pm2 monit`
- Vérifiez l'accès depuis les machines du réseau

### 8.3 Mises à Jour

Utilisez les scripts de maintenance intégrés :

```bash
# Vérifier les mises à jour disponibles
npm run deps:check

# Mettre à jour les dépendances
npm run deps:update

# Corriger les vulnérabilités
npm run deps:audit
```

### 8.4 Maintenance Périodique

Exécutez la maintenance quotidienne :

```bash
npm run maintenance
```

Ou configurez un cron job :
```bash
0 2 * * * cd /chemin/vers/Blueprint && npm run maintenance
```

## 9. Évolutions Futures (Projets Étudiants)

Les fonctionnalités suivantes pourront être ajoutées dans le cadre des projets étudiants de l'année prochaine :

- **Reverse Proxy (Nginx/Apache)** : Intégration avec le site web principal de l'école
- **HTTPS/SSL** : Sécurisation des communications avec certificats
- **Cache Redis** : Amélioration des performances avec cache distribué
- **Load Balancing** : Répartition de charge pour plusieurs instances
- **Monitoring avancé** : Intégration avec des outils de monitoring (Grafana, Prometheus)
- **CI/CD** : Pipeline de déploiement automatique

## Support

Pour toute question ou problème, consultez :
- [Index documentation](../README.md)
- [Architecture](../architecture/ARCHITECTURE.md)
- [Maintenance](../maintenance/MAINTENANCE.md)
- [Performance](../performance/PERFORMANCE.md)
- Issues GitHub : https://github.com/1ALibermann4/Blueprint/issues
