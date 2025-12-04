# Guide de Démarrage Rapide - BluePrint avec Podman

Guide rapide pour déployer BluePrint avec Podman en 5 minutes.

## Prérequis

- Podman installé sur le serveur
- Accès au serveur (SSH ou local)

## Installation rapide

### 1. Cloner ou copier le projet

```bash
cd /chemin/vers/le/serveur
# Si depuis Git:
# git clone https://github.com/1ALibermann4/Blueprint.git
# cd Blueprint
```

### 2. Configurer l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

**Variables essentielles à modifier :**
- `SESSION_SECRET` : Générer avec :
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `BASE_URL` : URL complète (https://blueprintlab.mde.epf.fr)

### 3. Rendre les scripts exécutables

```bash
chmod +x deploy/*.sh
```

### 4. Construire et déployer

```bash
# Construire l'image
./deploy/build.sh

# Déployer l'application
./deploy/deploy.sh
```

C'est tout ! L'application est maintenant accessible sur le port 8000.

## Commandes utiles

### Voir les logs
```bash
./deploy/logs.sh          # Dernières 50 lignes
./deploy/logs.sh -f       # En temps réel
```

### Redémarrer
```bash
./deploy/restart.sh
```

### Arrêter
```bash
./deploy/stop.sh
```

### Mettre à jour
```bash
./deploy/update.sh
```

## Vérification

### Health check
```bash
curl http://localhost:8000/api/health
```

### Statut du conteneur
```bash
podman ps | grep blueprint-app
```

### Logs
```bash
podman logs blueprint-app
```

## Configuration du reverse proxy

Le reverse proxy doit rediriger `blueprintlab.mde.epf.fr` vers `localhost:8000`.

Exemple de configuration Nginx :

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

## Dépannage

### Le conteneur ne démarre pas
```bash
# Voir les logs d'erreur
podman logs blueprint-app

# Vérifier les permissions
ls -la blueprint_local/
```

### Port déjà utilisé
```bash
# Vérifier quel processus utilise le port
sudo lsof -i :8000

# Ou changer le port dans .env et podman-compose.yml
```

### Erreur de permissions SELinux
Les volumes utilisent le flag `:Z` pour SELinux. Si vous avez des erreurs, vérifiez les permissions.

## Documentation complète

- **Déploiement détaillé** : [DEPLOYMENT_PODMAN.md](./DEPLOYMENT_PODMAN.md)
- **Checklist** : [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)
- **Sécurité** : [../security/SECURITY_IMPROVEMENTS.md](../security/SECURITY_IMPROVEMENTS.md)
- **Architecture** : [../architecture/ARCHITECTURE.md](../architecture/ARCHITECTURE.md)
- **Index documentation** : [../README.md](../README.md)

## Support

En cas de problème :
1. Vérifiez les logs : `./deploy/logs.sh -f`
2. Vérifiez le health check : `curl http://localhost:8000/api/health`
3. Consultez la documentation complète

