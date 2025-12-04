# Guide de Déploiement avec Podman

Ce guide explique comment déployer BluePrint en utilisant Podman pour la conteneurisation.

## Prérequis

- **Podman** installé sur le serveur
- **podman-compose** (optionnel, pour utiliser docker-compose.yml)
- Accès root ou utilisateur avec permissions Podman

## Installation de Podman

### Sur RHEL/CentOS/Fedora
```bash
sudo dnf install podman podman-compose
```

### Sur Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install podman podman-compose
```

### Vérifier l'installation
```bash
podman --version
podman-compose --version
```

## Configuration

### 1. Créer le fichier `.env`

Copiez `.env.example` en `.env` et configurez les variables :

```bash
cp .env.example .env
nano .env
```

**Variables importantes :**
- `SESSION_SECRET` : Générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PORT=8000` : Port d'écoute (doit correspondre au port du reverse proxy)
- `BASE_URL` : URL complète de l'application (https://blueprintlab.mde.epf.fr)
- `TRUST_PROXY=true` : Activer car derrière un reverse proxy

### 2. Générer un secret de session

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiez le résultat dans `.env` pour `SESSION_SECRET`.

## Construction de l'image

### Avec Containerfile (Podman natif)

```bash
podman build -t blueprint-app:latest -f Containerfile .
```

### Avec Dockerfile (compatible)

```bash
podman build -t blueprint-app:latest -f Dockerfile .
```

### Avec un tag de version

```bash
podman build -t blueprint-app:v1.0.0 -f Containerfile .
```

## Démarrage avec Podman

### Option 1 : Commande directe

```bash
podman run -d \
  --name blueprint-app \
  -p 8000:8000 \
  --env-file .env \
  -v ./blueprint_local:/app/blueprint_local:Z \
  -v ./logs:/app/logs:Z \
  -v ./rejection_reasons.json:/app/rejection_reasons.json:Z \
  -v ./available_tags.json:/app/available_tags.json:Z \
  -v ./featured_projects.json:/app/featured_projects.json:Z \
  --restart unless-stopped \
  blueprint-app:latest
```

### Option 2 : Avec podman-compose

```bash
podman-compose -f podman-compose.yml up -d
```

### Option 3 : Avec docker-compose (compatible)

```bash
podman-compose -f docker-compose.yml up -d
```

## Gestion du conteneur

### Voir les logs

```bash
podman logs -f blueprint-app
```

### Arrêter le conteneur

```bash
podman stop blueprint-app
```

### Redémarrer le conteneur

```bash
podman restart blueprint-app
```

### Supprimer le conteneur

```bash
podman stop blueprint-app
podman rm blueprint-app
```

### Voir le statut

```bash
podman ps -a
podman inspect blueprint-app
```

### Health check

Le conteneur inclut un health check automatique. Vérifier le statut :

```bash
podman inspect blueprint-app | grep -A 10 Health
```

## Mise à jour de l'application

### Méthode 1 : Rebuild et restart

```bash
# Arrêter le conteneur
podman stop blueprint-app
podman rm blueprint-app

# Reconstruire l'image
podman build -t blueprint-app:latest -f Containerfile .

# Redémarrer
podman-compose -f podman-compose.yml up -d
```

### Méthode 2 : Avec podman-compose

```bash
podman-compose -f podman-compose.yml pull
podman-compose -f podman-compose.yml up -d --build
```

## Volumes et persistance des données

Les données suivantes sont persistées via des volumes :

- `blueprint_local/` : Tous les projets (drafts et publiés)
- `logs/` : Fichiers de log
- `rejection_reasons.json` : Motifs de rejet
- `available_tags.json` : Tags disponibles
- `featured_projects.json` : Projets à la une

**Important :** Le flag `:Z` est nécessaire pour SELinux sur certains systèmes Linux.

## Variables d'environnement

Les variables peuvent être définies dans :
1. Le fichier `.env` (recommandé)
2. Directement dans la commande `podman run -e VAR=value`
3. Dans `docker-compose.yml` ou `podman-compose.yml`

## Dépannage

### Le conteneur ne démarre pas

```bash
# Voir les logs
podman logs blueprint-app

# Vérifier les permissions
ls -la blueprint_local/
```

### Erreur de permissions SELinux

Si vous voyez des erreurs de permissions, utilisez le flag `:Z` sur les volumes :

```bash
podman run ... -v ./blueprint_local:/app/blueprint_local:Z ...
```

### Port déjà utilisé

Si le port 8000 est déjà utilisé :

```bash
# Vérifier quel processus utilise le port
sudo lsof -i :8000

# Ou changer le port dans .env et docker-compose.yml
```

### Rebuild complet

```bash
# Supprimer l'image
podman rmi blueprint-app:latest

# Reconstruire
podman build -t blueprint-app:latest -f Containerfile .
```

## Sécurité

### Utilisateur non-root

Le conteneur s'exécute avec un utilisateur non-root (`nodejs:1001`) pour la sécurité.

### Secrets

Ne jamais commiter le fichier `.env` dans Git. Il est déjà dans `.gitignore`.

### Health check

Le health check vérifie que l'application répond correctement sur `/api/health`.

## Intégration avec le reverse proxy

Le conteneur écoute sur le port 8000. Le reverse proxy doit être configuré pour rediriger `blueprintlab.mde.epf.fr` vers `localhost:8000`.

### Configuration Nginx (exemple)

```nginx
upstream blueprint_backend {
    server localhost:8000;
    keepalive 32;
}

server {
    listen 443 ssl;
    server_name blueprintlab.mde.epf.fr;
    
    # Configuration SSL (gérée en amont)
    
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
    }
}
```

## Sauvegardes

Les volumes montés permettent de sauvegarder facilement :

```bash
# Sauvegarder les projets
tar -czf backup-$(date +%Y%m%d).tar.gz blueprint_local/

# Sauvegarder les fichiers de configuration
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  rejection_reasons.json \
  available_tags.json \
  featured_projects.json \
  .env
```

## Support

Pour toute question ou problème :
- Consultez les logs : `podman logs blueprint-app`
- Vérifiez le health check : `curl http://localhost:8000/api/health`
- Consultez la documentation :
  - [Guide rapide](./QUICK_START.md)
  - [Déploiement général](./DEPLOYMENT.md)
  - [Index documentation](../README.md)

