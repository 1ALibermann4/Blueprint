# Documentation BluePrint

Documentation complète de la plateforme BluePrint.

## 📚 Navigation

- **[README.md](./README.md)** - Guide de démarrage rapide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture technique
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Guide de déploiement
- **[MAINTENANCE.md](./MAINTENANCE.md)** - Guide de maintenance
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Analyse de performance
- **[documentation/REFERENCE_API.md](./documentation/REFERENCE_API.md)** - Référence API complète
- **[documentation/GUIDE_DEVELOPPEMENT.md](./documentation/GUIDE_DEVELOPPEMENT.md)** - Guide développeur

---

## Vue d'Ensemble

BluePrint est une plateforme web permettant aux étudiants de créer, soumettre et publier des pages de projet via une interface d'édition visuelle (WYSIWYG). Le système gère un workflow complet de création → soumission → validation → publication.

### Fonctionnalités Principales

- **Éditeur WYSIWYG** : Édition visuelle avec TinyMCE
- **Gestion de projets** : Création, modification, soumission de brouillons
- **Workflow de validation** : Système de relecture par les administrateurs
- **Publication automatique** : Génération de pages HTML statiques
- **Gestion des tags** : Système de tags/thèmes dynamiques
- **Projets à la une** : Mise en avant de projets spécifiques (positions 1-4)
- **Galerie multimédia** : Upload et gestion d'images, vidéos, PDFs
- **Pages publiques** : Page d'accueil et liste des projets avec filtrage

---

## Structure du Projet

```
Blueprint/
├── server.js                    # Serveur Express principal
├── logger.js                    # Système de logging
├── utils/                       # Utilitaires (sanitization, rotation logs)
├── scripts/                     # Scripts de maintenance
├── blueprint_local/
│   ├── intranet/                # Interface d'édition (étudiants)
│   ├── admin/                   # Interface d'administration
│   ├── public/                  # Pages publiques
│   └── styles/                  # Fichiers CSS
└── documentation/              # Documentation technique
```

Voir **[ARCHITECTURE.md](./ARCHITECTURE.md)** pour les détails complets.

---

## Guide d'Utilisation

### Pour les Étudiants

1. **Connexion** : `/login.html` → Entrer un nom d'utilisateur
2. **Créer un projet** : `/intranet/brouillons.html` → "Nouveau Projet"
3. **Éditer** : Modifier le contenu dans l'éditeur WYSIWYG
4. **Sauvegarder** : "Enregistrer et quitter"
5. **Soumettre** : "Soumettre pour relecture"

### Pour les Administrateurs

1. **Valider** : `/admin/validate.html` → Consulter les projets en attente
2. **Aperçu** : "Relire" pour voir le rendu complet
3. **Publier** : "Valider" pour publier ou "Rejeter" pour renvoyer en brouillon
4. **Mettre à la une** : Définir une position (1-4) lors de la validation

### Pour les Visiteurs

- **Page d'accueil** : `/page_accueil.html` - Projets mis en avant
- **Liste des projets** : `/public/project_list.html` - Tous les projets avec filtrage
- **Projet individuel** : `/public/projects/published/{nom}.html`

---

## API REST

Voir **[documentation/REFERENCE_API.md](./documentation/REFERENCE_API.md)** pour la documentation complète de l'API.

### Routes Principales

- `POST /api/login` - Connexion
- `GET /api/projects/drafts` - Liste des brouillons
- `POST /api/drafts` - Créer/modifier un brouillon
- `POST /api/publish` - Publier un projet (admin)
- `GET /api/projects/published` - Liste des projets publiés
- `GET /api/tags` - Liste des tags
- `POST /api/upload` - Téléverser un fichier

---

## Configuration

### Variables d'Environnement (Optionnel)

Créer un fichier `.env` :

```bash
PORT=3000
SESSION_SECRET=votre-secret-genere
MAX_LOG_SIZE=10485760  # 10 MB
```

### OpenID Connect (Optionnel)

Copier `openid-config.js.example` vers `openid-config.js` et configurer :

```javascript
module.exports = {
  issuer: 'https://votre-fournisseur-openid.com',
  client_id: 'VOTRE_CLIENT_ID',
  client_secret: 'VOTRE_CLIENT_SECRET',
  redirect_uri: 'http://IP_SERVEUR:3000/auth/callback',
  scope: 'openid profile email'
};
```

---

## Déploiement

Voir **[DEPLOYMENT.md](./DEPLOYMENT.md)** pour les instructions complètes.

### Déploiement Local (Réseau École)

1. Installer : `npm install --production`
2. Configurer : Créer `openid-config.js` si nécessaire
3. Démarrer : `npm start` ou `pm2 start server.js`
4. Accès : `http://IP_SERVEUR:3000`

---

## Maintenance

Voir **[MAINTENANCE.md](./MAINTENANCE.md)** pour le guide complet.

### Commandes Utiles

```bash
npm run maintenance    # Nettoyage des logs
npm run deps:check     # Vérifier les mises à jour
npm run deps:update # Mettre à jour les dépendances
```

---

## Performance

Voir **[PERFORMANCE.md](./PERFORMANCE.md)** pour l'analyse détaillée.

**Capacité** : 100 utilisateurs simultanés avec 2-4 cœurs CPU, 1-2 GB RAM

---

## Dépannage

### Problèmes Courants

**Le serveur ne démarre pas**
- Vérifier le port 3000
- Vérifier les dépendances : `npm install`

**Les projets ne s'affichent pas**
- Vérifier les permissions des répertoires
- Vérifier la console du navigateur (F12)

**Les images ne s'affichent pas**
- Vérifier les chemins dans les fichiers HTML
- Vérifier les permissions du répertoire `uploads/`

### Logs

```bash
# Logs PM2
pm2 logs blueprint-app

# Logs des actions
tail -f logs/backend-actions.json
```

---

## Support

- **Documentation** : Consulter les fichiers `.md` à la racine
- **Issues** : https://github.com/1ALibermann4/Blueprint/issues

---

**Dernière mise à jour** : Janvier 2025
