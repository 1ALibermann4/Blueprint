# Architecture BluePrint

Ce document décrit l'architecture technique du projet BluePrint.

## Vue d'ensemble

BluePrint est une application web Node.js/Express qui permet aux étudiants de créer, soumettre et publier des pages de projet via une interface WYSIWYG. L'application utilise un système de fichiers pour stocker les projets (Markdown avec front matter) et génère des pages HTML statiques pour la publication.

## Stack Technologique

- **Backend** : Node.js avec Express.js
- **Frontend** : HTML5, CSS3 (Bulma), JavaScript (Vanilla)
- **Éditeur** : TinyMCE (WYSIWYG)
- **Stockage** : Système de fichiers (Markdown + HTML)
- **Authentification** : OpenID Connect (optionnel) ou session simulée

## Structure des Données

### Projets (Brouillons)
Format : Markdown avec front matter (gray-matter)
- **Emplacement** : `blueprint_local/intranet/projects/drafts/`
- **Format** : `{titre}.md`
- **Structure** :
  ```markdown
  ---
  titre: "Nom du projet"
  tags: ["Tag1", "Tag2"]
  statut: "brouillon" | "en_attente" | "rejeté"
  auteur: "nom_utilisateur"
  dateCreation: "2025-01-XX"
  dateModification: "2025-01-XX"
  ---
  
  <!-- Contenu HTML du projet -->
  ```

### Projets Publiés
Format : HTML statique
- **Emplacement** : `blueprint_local/public/projects/published/`
- **Format** : `{titre}.html`
- **Génération** : À partir du template `page_projet.html` + contenu Markdown

### Métadonnées
- **Tags disponibles** : `available_tags.json`
- **Projets à la une** : `featured_projects.json`

## Architecture des Routes

### Routes Publiques
- `GET /page_accueil.html` - Page d'accueil
- `GET /public/project_list.html` - Liste des projets
- `GET /public/projects/published/:filename` - Projet publié

### Routes Intranet (Étudiants)
- `GET /intranet/brouillons.html` - Gestion des brouillons
- `GET /intranet/editor.html` - Éditeur WYSIWYG
- `POST /api/drafts` - Créer un brouillon
- `GET /api/drafts` - Lister les brouillons
- `PUT /api/drafts/:id` - Modifier un brouillon
- `POST /api/drafts/:id/submit` - Soumettre pour relecture
- `POST /api/upload` - Téléverser des médias

### Routes Admin
- `GET /admin/validate.html` - Validation des projets
- `GET /admin/review.html` - Aperçu d'un projet
- `POST /api/publish` - Publier un projet
- `POST /api/reject` - Rejeter un projet
- `GET /api/projects/pending` - Projets en attente
- `GET /api/projects/published` - Projets publiés

### Routes API Générales
- `GET /api/tags` - Liste des tags disponibles
- `POST /api/tags` - Ajouter un tag (admin)
- `GET /api/templates/project` - Template de projet (contenu principal)
- `GET /api/templates/project_full` - Template complet (avec header/footer)

## Flux de Données

### Création d'un Projet
1. Étudiant accède à `/intranet/editor.html`
2. Clique sur "Nouveau Projet"
3. Éditeur charge le template complet
4. Étudiant modifie le contenu via TinyMCE
5. Sauvegarde → `POST /api/drafts` → Stockage en Markdown
6. Soumission → `POST /api/drafts/:id/submit` → Statut → "en_attente"

### Publication d'un Projet
1. Admin accède à `/admin/validate.html`
2. Consulte les projets en attente
3. Aperçu via `/admin/review.html`
4. Validation → `POST /api/publish`
5. Génération HTML depuis template + contenu Markdown
6. Stockage dans `published/`
7. Mise à jour de `featured_projects.json` si position définie
8. Ajout des nouveaux tags à `available_tags.json`

### Affichage Public
1. Page d'accueil charge les projets avec `featuredPosition` 1-4
2. Extraction des images/vidéos depuis le HTML des projets
3. Affichage dynamique via JavaScript
4. Filtrage par tags via API `/api/tags`

## Sécurité

### Authentification
- **Développement** : Session simulée (tous les utilisateurs acceptés)
- **Production** : OpenID Connect (configuration via `openid-config.js`)
- **Sessions** : Express-session avec secret configurable

### Protection des Routes
- Routes `/intranet/*` et `/admin/*` protégées par middleware `checkAuth`
- Vérification du rôle utilisateur pour les actions admin

### Upload de Fichiers
- Validation des types MIME
- Stockage dans `blueprint_local/public/uploads/`
- Limite de taille configurable

## Performance

### Optimisations
- Génération de HTML statique pour les projets publiés
- Pas de base de données (système de fichiers)
- Cache des templates en mémoire
- Servir les fichiers statiques via Express.static

### Scalabilité
- Architecture stateless (sessions en mémoire)
- Pour production : utiliser Redis pour les sessions
- Reverse proxy (Nginx) recommandé

## Déploiement

Voir `DEPLOYMENT.md` pour les instructions complètes.

### Points Clés
- Variables d'environnement pour la configuration
- PM2 pour la gestion des processus
- Reverse proxy pour l'intégration avec le site principal
- HTTPS obligatoire en production

## Évolutions Futures

- Migration vers une base de données (MongoDB/PostgreSQL)
- API REST complète
- Support multi-utilisateurs avec rôles
- Export PDF des projets
- Système de commentaires
- Notifications par email

