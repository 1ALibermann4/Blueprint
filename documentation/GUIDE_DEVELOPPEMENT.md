# Guide de Développement - BluePrint

Ce guide est destiné aux développeurs qui souhaitent contribuer ou comprendre le code de BluePrint.

## Structure du Code

### Backend (`server.js`)

Le serveur Express est organisé en sections :

1. **Configuration** (lignes 1-43)
   - Import des dépendances
   - Configuration Express
   - Configuration des sessions
   - Middleware d'authentification
   - Configuration des répertoires

2. **Routes d'Authentification** (lignes 45-64)
   - `POST /api/login` : Connexion simulée

3. **Routes API - Brouillons** (lignes 82-338)
   - `GET /api/projects/drafts` : Liste des brouillons
   - `GET /api/projects/my_drafts` : Brouillons de l'utilisateur
   - `POST /api/drafts` : Créer/modifier un brouillon
   - `POST /api/submit_for_review` : Soumettre pour validation
   - `POST /api/reject_draft` : Rejeter un brouillon
   - `DELETE /api/drafts/:fileName` : Supprimer un brouillon

4. **Routes API - Projets Publiés** (lignes 150-207)
   - `GET /api/projects/published` : Liste des projets publiés

5. **Routes API - Templates** (lignes 210-238)
   - `GET /api/templates/project` : Template principal
   - `GET /api/templates/project_full` : Template complet

6. **Routes API - Publication** (lignes 399-478)
   - `POST /api/publish` : Publier un projet

7. **Routes API - Tags** (lignes 481-536)
   - `GET /api/tags` : Liste des tags
   - `POST /api/tags` : Ajouter un tag

8. **Routes API - Upload** (lignes 582-593)
   - `POST /api/upload` : Téléverser un fichier

9. **Routes API - Configuration** (lignes 617-635)
   - `POST /api/projects/featured` : Configurer les projets à la une
   - `GET /api/projects/featured` : Récupérer la configuration

10. **OpenID Connect** (lignes 642-738, commenté)
    - Routes d'authentification OpenID (désactivées par défaut)

### Frontend - Éditeur (`intranet/scripts/editor.js`)

Fichier principal de l'éditeur (1015 lignes)

#### Fonctions Principales

- **`loadNewProject()`** : Charge un nouveau projet avec le template
- **`loadDraft(fileName)`** : Charge un brouillon existant
- **`prepareTemplateForEditing(html)`** : Prépare le template pour l'édition
- **`makeContentEditable(container)`** : Rend les éléments éditables
- **`initializeEditor()`** : Initialise TinyMCE sur les éléments éditables
- **`addPerson(sectionElement)`** : Ajoute une personne (étudiant/encadrant)
- **`handleMediaUpload(mediaContainer)`** : Gère l'upload de médias
- **`saveDraft()`** : Sauvegarde le projet
- **`submitForReview()`** : Soumet pour validation

#### Gestion de TinyMCE

- Initialisation sur les éléments `.editable-text`
- Exclusion des cellules de tableau (`<td>`) - utilisation de `contenteditable` natif
- Réinitialisation après ajout d'éléments dynamiques
- Gestion des erreurs d'initialisation avec retry

### Frontend - Page d'Accueil (`public/scripts/accueil.js`)

#### Fonctions Utilitaires

- **`extractPresentationImage(doc)`** : Extrait l'image de présentation
  - Priorité 1 : Première image de la section Accueil
  - Priorité 2 : Première image de la galerie multimedia
  
- **`extractMultimediaImages(doc)`** : Extrait toutes les images multimédias

- **`createImageCarousel(container, images)`** : Crée un carousel automatique
  - Défilement toutes les 3 secondes
  - Transition fluide

#### Fonctions de Chargement

- **`loadFeaturedProject()`** : Charge le projet en position 1
- **`loadRecentProjects()`** : Charge les projets en positions 2-4
- **`loadTags()`** : Charge les tags dynamiquement

### Frontend - Liste des Projets (`public/scripts/project-list.js`)

- **`loadProjects(sortBy)`** : Charge et affiche les projets
- **`loadTags()`** : Charge les tags pour le filtrage
- **`initializeFilters()`** : Initialise le système de filtrage
- **`loadProjectImageForCard()`** : Charge l'image de présentation pour une carte

## Conventions de Code

### Nommage

- **Fichiers** : `kebab-case` (ex: `project-list.js`)
- **Variables/Fonctions** : `camelCase` (ex: `loadProjects`)
- **Constantes** : `UPPER_SNAKE_CASE` (ex: `DRAFTS_DIR`)
- **Classes** : `PascalCase` (rare dans ce projet)

### Structure des Fichiers

```javascript
// 1. Imports
const express = require('express');

// 2. Configuration
const app = express();

// 3. Middleware
app.use(express.json());

// 4. Routes
app.get('/route', handler);

// 5. Démarrage
app.listen(port);
```

### Gestion des Erreurs

Toujours utiliser try/catch pour les opérations asynchrones :

```javascript
try {
    const data = await fs.readFile(path, 'utf8');
    // Traitement
} catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Message d\'erreur' });
}
```

### Logging

Utiliser `logAction` pour les actions importantes :

```javascript
await logAction('ACTION_NAME', { 
    file: fileName, 
    result: 'success' 
});
```

## Tests

### Tests Unitaires

Fichier : `server.test.js`

```bash
npm test
```

### Tests Manuels

1. **Tester l'éditeur** :
   - Créer un nouveau projet
   - Ajouter des personnes
   - Uploader des médias
   - Sauvegarder

2. **Tester le workflow** :
   - Soumettre un projet
   - Valider en tant qu'admin
   - Vérifier la publication

3. **Tester les pages publiques** :
   - Vérifier l'affichage des projets
   - Tester le filtrage par tags
   - Vérifier les images de présentation

## Débogage

### Console du Navigateur

Ouvrir la console (F12) pour voir :
- Erreurs JavaScript
- Requêtes API
- Logs de débogage

### Logs Serveur

```bash
# Logs PM2
pm2 logs blueprint-app

# Logs des actions
tail -f logs/backend-actions.json
```

### Points de Débogage

Ajouter des `console.log()` temporaires :

```javascript
console.log('DEBUG:', { variable1, variable2 });
```

## Ajout de Nouvelles Fonctionnalités

### 1. Nouvelle Route API

```javascript
app.post('/api/nouvelle-route', checkAuth, async (req, res) => {
    try {
        // Logique
        await logAction('NOUVELLE_ACTION', { data });
        res.json({ message: 'Succès' });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});
```

### 2. Nouvelle Page Frontend

1. Créer le fichier HTML dans le bon répertoire
2. Créer le script JavaScript associé
3. Ajouter les styles CSS si nécessaire
4. Tester l'accès et les fonctionnalités

### 3. Modification du Template

1. Modifier `public/templates/page_projet.html`
2. Tester dans l'éditeur
3. Vérifier le rendu des projets publiés

## Bonnes Pratiques

### Sécurité

- Toujours valider les entrées utilisateur
- Utiliser `checkAuth` pour les routes protégées
- Sanitizer les noms de fichiers
- Limiter la taille des uploads

### Performance

- Éviter les lectures répétées de fichiers
- Utiliser `Promise.all()` pour les opérations parallèles
- Limiter la taille des logs
- Optimiser les requêtes API

### Maintenabilité

- Commenter le code complexe
- Utiliser des noms de variables explicites
- Séparer les responsabilités
- Documenter les fonctions importantes

## Ressources

- **Express.js** : https://expressjs.com/
- **TinyMCE** : https://www.tiny.cloud/docs/
- **Bulma CSS** : https://bulma.io/documentation/
- **gray-matter** : https://github.com/jonschlinkert/gray-matter

