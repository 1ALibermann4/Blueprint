# Guide de Déploiement sur Serveur de Staging

Guide complet pour déployer BluePrint sur un serveur de staging depuis GitHub avec Podman.

## Vue d'ensemble du processus

```
PC Local → Git Commit → GitHub → Serveur Staging (Git Pull) → Podman Build → Déploiement
```

## Étape 1 : Préparer et pousser le code depuis votre PC

### 1.1 Vérifier les fichiers à commiter

Assurez-vous que les fichiers sensibles ne sont pas commités :

```bash
# Vérifier le statut Git
git status

# Vérifier que .env n'est pas suivi
git check-ignore .env
# Doit retourner : .env
```

### 1.2 Commit et push

```bash
# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Vérifier ce qui sera commité
git status

# Commit avec un message descriptif
git commit -m "Préparation déploiement staging avec Podman"

# Push vers GitHub
git push origin main
# ou
git push origin master
```

### 1.3 Vérifier sur GitHub

- Allez sur votre dépôt GitHub
- Vérifiez que tous les fichiers sont présents
- Vérifiez que `.env` n'est **PAS** dans le dépôt

## Étape 2 : Préparer le serveur de staging

### 2.1 Se connecter au serveur

```bash
ssh utilisateur@adresse-serveur-staging
# ou
ssh utilisateur@blueprintlab.mde.epf.fr
```

### 2.2 Installer Git (si pas déjà installé)

**Sur RHEL/CentOS/Fedora :**
```bash
sudo dnf install git
```

**Sur Ubuntu/Debian :**
```bash
sudo apt-get update
sudo apt-get install git
```

**Vérifier l'installation :**
```bash
git --version
```

### 2.3 Installer Podman (si pas déjà installé)

**Sur RHEL/CentOS/Fedora :**
```bash
sudo dnf install podman podman-compose
```

**Sur Ubuntu/Debian :**
```bash
sudo apt-get update
sudo apt-get install podman podman-compose
```

**Vérifier l'installation :**
```bash
podman --version
podman-compose --version
```

### 2.4 Installer Node.js (pour générer SESSION_SECRET)

**Option 1 : Via le gestionnaire de paquets**
```bash
# RHEL/CentOS/Fedora
sudo dnf install nodejs npm

# Ubuntu/Debian
sudo apt-get install nodejs npm
```

**Option 2 : Via nvm (recommandé pour avoir une version récente)**
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
```

**Vérifier :**
```bash
node --version
npm --version
```

## Étape 3 : Cloner le projet depuis GitHub

### 3.1 Choisir un répertoire de déploiement

```bash
# Créer un répertoire pour les applications (si nécessaire)
sudo mkdir -p /opt/applications
# ou utiliser un répertoire utilisateur
mkdir -p ~/applications
cd ~/applications
```

### 3.2 Cloner le dépôt

```bash
# Si dépôt public
git clone https://github.com/VOTRE_USERNAME/Blueprint.git

# Si dépôt privé (nécessite authentification)
git clone https://github.com/VOTRE_USERNAME/Blueprint.git
# ou avec SSH
git clone git@github.com:VOTRE_USERNAME/Blueprint.git
```

**Note :** Pour les dépôts privés, vous devrez peut-être configurer l'authentification GitHub :
```bash
# Générer une clé SSH (si pas déjà fait)
ssh-keygen -t ed25519 -C "votre-email@example.com"

# Afficher la clé publique
cat ~/.ssh/id_ed25519.pub
# Copier cette clé dans GitHub → Settings → SSH and GPG keys
```

### 3.3 Entrer dans le répertoire

```bash
cd Blueprint
```

## Étape 4 : Configurer l'environnement

### 4.1 Créer le fichier .env

```bash
# Copier le template
cp .env.example .env

# Éditer avec vos valeurs
nano .env
# ou
vi .env
```

### 4.2 Configurer les variables d'environnement

Éditez `.env` avec les valeurs suivantes :

```bash
# Port d'écoute (doit correspondre au port du reverse proxy)
PORT=8000

# Environnement
NODE_ENV=production

# Secret de session - GÉNÉRER UN SECRET FORT ET UNIQUE
# Sur le serveur, exécutez :
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=votre-secret-genere-ici

# URL de base de l'application
BASE_URL=https://blueprintlab.mde.epf.fr

# Faire confiance au reverse proxy
TRUST_PROXY=true
```

**Générer SESSION_SECRET :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiez le résultat et collez-le dans `.env` pour `SESSION_SECRET`.

### 4.3 Vérifier les permissions

```bash
# S'assurer que .env n'est pas accessible par tous
chmod 600 .env

# Vérifier
ls -la .env
# Doit afficher : -rw------- (seul le propriétaire peut lire/écrire)
```

## Étape 5 : Configurer Nginx (reverse proxy)

### 5.1 Vérifier que Nginx est installé

```bash
nginx -v
# ou
sudo systemctl status nginx
```

**Si Nginx n'est pas installé :**
```bash
# RHEL/CentOS/Fedora
sudo dnf install nginx

# Ubuntu/Debian
sudo apt-get install nginx
```

### 5.2 Créer la configuration Nginx

```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/blueprintlab
# ou sur certains systèmes
sudo nano /etc/nginx/conf.d/blueprintlab.conf
```

**Configuration Nginx :**

```nginx
upstream blueprint_backend {
    server localhost:8000;
    keepalive 32;
}

server {
    listen 80;
    server_name blueprintlab.mde.epf.fr;
    
    # Redirection HTTPS (si SSL est géré en amont)
    # return 301 https://$server_name$request_uri;
    
    # Ou directement en HTTP pour staging
    location / {
        proxy_pass http://blueprint_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Servir les fichiers statiques directement (optionnel, pour performance)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|mp4|webp)$ {
        proxy_pass http://blueprint_backend;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 5.3 Activer la configuration

**Sur systèmes avec sites-available/sites-enabled :**
```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/blueprintlab /etc/nginx/sites-enabled/

# Vérifier la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

**Sur systèmes avec conf.d :**
```bash
# Vérifier la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 5.4 Vérifier que le port 8000 est accessible

```bash
# Vérifier qu'aucun firewall ne bloque le port
sudo firewall-cmd --list-ports  # RHEL/CentOS/Fedora
# ou
sudo ufw status  # Ubuntu/Debian

# Si nécessaire, ouvrir le port
sudo firewall-cmd --add-port=8000/tcp --permanent  # RHEL/CentOS/Fedora
sudo firewall-cmd --reload
# ou
sudo ufw allow 8000/tcp  # Ubuntu/Debian
```

## Étape 6 : Préparer les scripts de déploiement

### 6.1 Rendre les scripts exécutables

```bash
chmod +x deploy/*.sh
```

### 6.2 Vérifier l'environnement

```bash
./deploy/check.sh
```

Cela vérifie :
- Installation de Podman
- Présence des fichiers essentiels
- Configuration du fichier `.env`
- Permissions des scripts

## Étape 7 : Construire l'image Podman

### 7.1 Construire l'image

```bash
./deploy/build.sh
```

Ou manuellement :
```bash
podman build -t blueprint-app:latest -f Containerfile .
```

### 7.2 Vérifier que l'image est créée

```bash
podman images | grep blueprint-app
```

## Étape 8 : Déployer l'application

### 8.1 Déployer avec le script

```bash
./deploy/deploy.sh
```

Ce script :
- Vérifie la configuration
- Arrête le conteneur existant (s'il existe)
- Crée les répertoires nécessaires
- Démarre le conteneur
- Vérifie le health check

### 8.2 Vérifier le déploiement

```bash
# Vérifier que le conteneur tourne
podman ps | grep blueprint-app

# Vérifier les logs
./deploy/logs.sh

# Vérifier le health check
curl http://localhost:8000/api/health
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2025-01-03T...",
  "uptime": 123.45
}
```

## Étape 9 : Vérifier l'accès via Nginx

### 9.1 Tester depuis le serveur

```bash
# Tester l'accès local
curl http://localhost/api/health
curl http://blueprintlab.mde.epf.fr/api/health
```

### 9.2 Tester depuis l'extérieur

Depuis votre PC ou un autre navigateur :
- Accéder à : `http://blueprintlab.mde.epf.fr` (ou HTTPS si configuré)
- Vérifier la page d'accueil
- Vérifier la liste des projets

## Étape 10 : Configuration finale

### 10.1 Vérifier les volumes persistants

Les données suivantes sont sauvegardées via des volumes :
- `blueprint_local/` : Tous les projets
- `logs/` : Fichiers de log
- `rejection_reasons.json` : Motifs de rejet
- `available_tags.json` : Tags disponibles
- `featured_projects.json` : Projets à la une

Vérifier que les répertoires existent :
```bash
ls -la blueprint_local/
ls -la logs/
```

### 10.2 Configurer le démarrage automatique (optionnel)

Le conteneur est configuré avec `restart: unless-stopped`, il redémarrera automatiquement.

Pour vérifier :
```bash
podman inspect blueprint-app | grep -i restart
```

## Commandes utiles pour la gestion

### Voir les logs
```bash
./deploy/logs.sh          # Dernières 50 lignes
./deploy/logs.sh -f       # Suivre en temps réel
```

### Redémarrer
```bash
./deploy/restart.sh
```

### Arrêter
```bash
./deploy/stop.sh
```

### Mettre à jour (après un git pull)
```bash
# Sur le serveur
cd ~/applications/Blueprint
git pull origin main

# Mettre à jour l'application
./deploy/update.sh
```

## Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs d'erreur
podman logs blueprint-app

# Vérifier les permissions
ls -la blueprint_local/
```

### Nginx ne redirige pas correctement

```bash
# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Tester la configuration
sudo nginx -t

# Vérifier que le conteneur écoute sur le port 8000
sudo netstat -tlnp | grep 8000
# ou
sudo ss -tlnp | grep 8000
```

### Port déjà utilisé

```bash
# Vérifier quel processus utilise le port
sudo lsof -i :8000
# ou
sudo ss -tlnp | grep 8000

# Arrêter le processus ou changer le port dans .env
```

### Erreur de permissions SELinux

```bash
# Vérifier les permissions
ls -la blueprint_local/

# Si nécessaire, ajuster les permissions
sudo chcon -Rt svirt_sandbox_file_t blueprint_local/
```

## Checklist de déploiement

- [ ] Code commité et poussé sur GitHub
- [ ] Git installé sur le serveur
- [ ] Podman installé sur le serveur
- [ ] Node.js installé sur le serveur
- [ ] Projet cloné depuis GitHub
- [ ] Fichier `.env` créé et configuré
- [ ] `SESSION_SECRET` généré et configuré
- [ ] Nginx installé et configuré
- [ ] Configuration Nginx testée (`nginx -t`)
- [ ] Nginx rechargé
- [ ] Port 8000 ouvert dans le firewall
- [ ] Scripts de déploiement exécutables
- [ ] Image Podman construite
- [ ] Conteneur déployé et fonctionnel
- [ ] Health check réussi
- [ ] Application accessible via le domaine

## Prochaines étapes

Une fois le déploiement réussi :

1. **Tester toutes les fonctionnalités** :
   - Créer un projet
   - Soumettre pour relecture
   - Publier un projet
   - Vérifier l'affichage public

2. **Configurer les sauvegardes** (voir [MAINTENANCE.md](../maintenance/MAINTENANCE.md))

3. **Configurer le monitoring** (optionnel)

4. **Documenter les accès** et les credentials

## Support

En cas de problème :
- Consultez les logs : `./deploy/logs.sh -f`
- Vérifiez le health check : `curl http://localhost:8000/api/health`
- Consultez la [documentation complète](./DEPLOYMENT_PODMAN.md)
- Vérifiez la [checklist de déploiement](./DEPLOYMENT_CHECKLIST.md)

