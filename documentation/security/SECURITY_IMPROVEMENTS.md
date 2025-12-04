# Améliorations de Sécurité et Déploiement

Ce document décrit les améliorations de sécurité et de déploiement apportées à BluePrint.

## Résumé des modifications

### 1. Configuration pour production derrière reverse proxy

- **Port** : Changé de 3000 à 8000 (configurable via `PORT`)
- **Trust Proxy** : Activé pour détecter HTTPS depuis le reverse proxy
- **Variables d'environnement** : Utilisation de `.env` pour la configuration
- **Session sécurisée** : Cookies `secure`, `httpOnly`, `sameSite: strict`

### 2. Middlewares de sécurité ajoutés

#### Helmet.js
- Headers de sécurité HTTP
- Content Security Policy (CSP)
- Protection contre XSS, clickjacking, etc.

#### Rate Limiting
- **API générale** : 100 requêtes par 15 minutes par IP
- **Uploads** : 20 uploads par 15 minutes par IP

#### Sanitization
- **express-mongo-sanitize** : Protection contre les injections NoSQL
- **xss-clean** : Protection contre les attaques XSS
- **hpp** : Protection contre HTTP Parameter Pollution

### 3. Validation des entrées

- **express-validator** : Validation et sanitization des données d'entrée
- Validation sur la route `/api/drafts` :
  - Titre : 1-200 caractères
  - Tags : Tableau avec validation de chaque tag
  - Contenu : Validation de type

### 4. Sécurisation des uploads

- **Types MIME autorisés** :
  - Images : JPEG, PNG, GIF, WebP
  - Vidéos : MP4
  - Documents : PDF
- **Taille maximale** : 50MB
- **Sanitization des noms de fichiers** : Suppression des caractères dangereux
- **Validation double** : Vérification MIME avant et après upload
- **Suppression automatique** : Fichiers non autorisés supprimés immédiatement

### 5. Conteneurisation avec Podman

- **Dockerfile** et **Containerfile** : Images optimisées avec Node.js Alpine
- **Utilisateur non-root** : Sécurité renforcée
- **Health check** : Route `/api/health` pour le monitoring
- **Volumes persistants** : Données sauvegardées en dehors du conteneur
- **docker-compose.yml** et **podman-compose.yml** : Configuration de déploiement

## Installation des dépendances

Avant de démarrer l'application, installer les nouvelles dépendances :

```bash
npm install
```

### Nouvelles dépendances

- `dotenv` : Gestion des variables d'environnement
- `helmet` : Headers de sécurité HTTP
- `express-rate-limit` : Limitation du taux de requêtes
- `express-mongo-sanitize` : Protection injection NoSQL
- `xss-clean` : Protection XSS
- `hpp` : Protection HTTP Parameter Pollution
- `express-validator` : Validation des entrées
- `validator` : Utilitaires de validation

## Configuration

### Fichier .env

Créer un fichier `.env` à la racine du projet (voir `.env.example`) :

```bash
PORT=8000
NODE_ENV=production
SESSION_SECRET=votre-secret-genere
BASE_URL=https://blueprintlab.mde.epf.fr
TRUST_PROXY=true
```

**Important** : Générer un secret fort pour `SESSION_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Déploiement

### Option 1 : Sans conteneur

```bash
# Installer les dépendances
npm install

# Configurer .env
cp .env.example .env
# Éditer .env avec vos valeurs

# Démarrer
npm start
```

### Option 2 : Avec Podman

Voir `DEPLOYMENT_PODMAN.md` pour les instructions complètes.

```bash
# Construire l'image
podman build -t blueprint-app:latest -f Containerfile .

# Démarrer avec podman-compose
podman-compose -f podman-compose.yml up -d
```

## Vérification

### Health check

Vérifier que l'application fonctionne :

```bash
curl http://localhost:8000/api/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "timestamp": "2025-01-03T...",
  "uptime": 123.45
}
```

### Test de sécurité

Vérifier les headers de sécurité :

```bash
curl -I http://localhost:8000/
```

Vous devriez voir des headers comme :
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: ...`

## Migration depuis l'ancienne version

### 1. Sauvegarder les données

```bash
# Sauvegarder les projets
tar -czf backup-projects.tar.gz blueprint_local/

# Sauvegarder les fichiers de configuration
tar -czf backup-config.tar.gz \
  rejection_reasons.json \
  available_tags.json \
  featured_projects.json
```

### 2. Mettre à jour le code

```bash
git pull
npm install
```

### 3. Configurer .env

```bash
cp .env.example .env
# Éditer .env
```

### 4. Redémarrer

```bash
# Si avec PM2
pm2 restart blueprint-app

# Si avec Podman
podman restart blueprint-app

# Si directement
npm start
```

## Notes importantes

### Authentification

L'authentification est actuellement désactivée (`checkAuth` retourne toujours `next()`). Pour la production, il faudra :

1. Activer OpenID Connect (code déjà présent mais commenté)
2. Ou implémenter un système d'authentification approprié

### Reverse Proxy

L'application est conçue pour fonctionner derrière un reverse proxy qui :
- Gère SSL/TLS
- Redirige `blueprintlab.mde.epf.fr` vers le port 8000
- Passe les headers `X-Forwarded-*` correctement

### Rate Limiting

Les limites peuvent être ajustées dans `server.js` si nécessaire :

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // Ajuster selon les besoins
});
```

## Support

Pour toute question :
- Documentation : `DEPLOYMENT_PODMAN.md`
- Logs : `podman logs blueprint-app` ou `pm2 logs blueprint-app`
- Health check : `curl http://localhost:8000/api/health`

