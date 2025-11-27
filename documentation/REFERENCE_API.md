# Référence API - BluePrint

Documentation complète de l'API REST de BluePrint.

## Base URL

```
http://IP_SERVEUR:3000/api
```

## Authentification

La plupart des routes nécessitent une authentification via session. Les routes publiques sont marquées avec `[PUBLIC]`.

---

## Authentification

### POST /api/login

Connexion simulée (développement uniquement).

**Request Body** :
```json
{
  "username": "nom_utilisateur"
}
```

**Response 200** :
```json
{
  "message": "Login successful."
}
```

**Response 400** :
```json
{
  "message": "Username is required."
}
```

---

## Brouillons

### GET /api/projects/drafts

Liste tous les brouillons en attente de relecture (admin).

**Query Parameters** :
- `sortBy` (optionnel) : `date` | `title`
- `tag` (optionnel) : Filtrer par tag

**Response 200** :
```json
[
  {
    "titre": "Nom du projet",
    "tags": ["Tag1", "Tag2"],
    "statut": "pending_review",
    "auteur": "nom_utilisateur",
    "dateCreation": "2025-01-XX",
    "dateModification": "2025-01-XX",
    "fileName": "nom_projet.md"
  }
]
```

### GET /api/projects/my_drafts

Liste les brouillons de l'utilisateur connecté.

**Query Parameters** :
- `sortBy` (optionnel) : `date` | `title`
- `tag` (optionnel) : Filtrer par tag

**Response 200** :
```json
[
  {
    "titre": "Mon projet",
    "tags": ["Tag1"],
    "statut": "draft",
    "dateModification": "2025-01-XX",
    "fileName": "mon_projet.md"
  }
]
```

### POST /api/drafts

Crée ou met à jour un brouillon.

**Request Body** :
```json
{
  "titre": "Nom du projet",
  "content": "<html>Contenu HTML</html>",
  "tags": ["Tag1", "Tag2"],
  "currentFile": "ancien_nom.md"  // Optionnel, pour les mises à jour
}
```

**Response 201** :
```json
{
  "message": "Draft saved successfully",
  "file": "nom_projet.md"
}
```

**Response 400** :
```json
{
  "error": "Title is required"
}
```

**Notes** :
- Le nom de fichier est généré automatiquement à partir du titre
- Gestion automatique des accents et doublons
- Si `currentFile` est fourni, le fichier est renommé si nécessaire

### GET /api/project

Récupère le contenu d'un projet.

**Query Parameters** :
- `file` (requis) : Nom du fichier
- `type` (requis) : `draft` | `published`

**Response 200** :
```json
{
  "frontMatter": {
    "titre": "Nom du projet",
    "tags": ["Tag1"],
    "statut": "draft",
    "dateCreation": "2025-01-XX",
    "dateModification": "2025-01-XX"
  },
  "content": "<html>Contenu HTML</html>"
}
```

### POST /api/submit_for_review

Soumet un brouillon pour validation.

**Request Body** :
```json
{
  "file": "nom_projet.md"
}
```

**Response 200** :
```json
{
  "message": "Draft submitted for review"
}
```

### POST /api/reject_draft

Rejette un projet (admin).

**Request Body** :
```json
{
  "file": "nom_projet.md",
  "reason": "Raison du rejet"  // Optionnel
}
```

**Response 200** :
```json
{
  "message": "Draft rejected"
}
```

### DELETE /api/drafts/:fileName

Supprime un brouillon.

**Response 200** :
```json
{
  "message": "Draft nom_projet.md deleted successfully."
}
```

---

## Projets Publiés

### GET /api/projects/published [PUBLIC]

Liste tous les projets publiés.

**Query Parameters** :
- `sortBy` (optionnel) : `date` | `title` (défaut: `date`)
- `tag` (optionnel) : Filtrer par tag
- `include_featured` (optionnel) : `true` | `false` - Inclure les informations de mise en avant

**Response 200** :
```json
[
  {
    "fileName": "projet_1.html",
    "titre": "Nom du projet",
    "tags": ["Tag1", "Tag2"],
    "dateModification": "2025-01-XX",
    "isFeatured": true,           // Si include_featured=true
    "featuredPosition": 1          // Si include_featured=true
  }
]
```

### POST /api/publish

Publie un projet (admin).

**Request Body** :
```json
{
  "file": "nom_projet.md",
  "featuredPosition": 1  // Optionnel, 1-4 pour mettre à la une
}
```

**Response 200** :
```json
{
  "message": "Project nom_projet.html published successfully"
}
```

**Notes** :
- Génère un fichier HTML dans `published/`
- Déplace le Markdown vers `published_md/`
- Ajoute automatiquement les nouveaux tags à `available_tags.json`
- Met à jour `featured_projects.json` si `featuredPosition` est fourni

---

## Templates

### GET /api/templates/project

Récupère le template de projet (contenu principal uniquement).

**Response 200** :
```html
<!-- Contenu de la balise <main> -->
```

### GET /api/templates/project_full

Récupère le template complet (avec header/footer).

**Response 200** :
```html
<!DOCTYPE html>
<html>
<!-- Template complet -->
</html>
```

---

## Tags

### GET /api/tags [PUBLIC]

Liste tous les tags disponibles.

**Response 200** :
```json
["Informatique", "IA", "Robotique", "Électronique"]
```

### POST /api/tags

Ajoute un nouveau tag (admin).

**Request Body** :
```json
{
  "tag": "NouveauTag"
}
```

**Response 200** :
```json
{
  "message": "Tag added successfully"
}
```

**Response 400** :
```json
{
  "error": "Tag is required"
}
```

---

## Upload

### POST /api/upload

Téléverse un fichier (image, vidéo, PDF).

**Content-Type** : `multipart/form-data`

**Form Data** :
- `file` : Fichier à téléverser

**Response 200** :
```json
{
  "url": "/public/uploads/1764191658126-filename.jpg"
}
```

**Response 400** :
```json
{
  "error": "No file uploaded"
}
```

**Limites** :
- Types acceptés : Images (jpg, png, gif, webp), Vidéos (mp4), PDFs
- Taille maximale : Configurable (défaut: 10 MB)

---

## Configuration

### GET /api/projects/featured

Récupère la configuration des projets à la une.

**Response 200** :
```json
{
  "featured": [
    {
      "fileName": "projet_1.html",
      "position": 1
    },
    {
      "fileName": "projet_2.html",
      "position": 2
    }
  ]
}
```

### POST /api/projects/featured

Met à jour la configuration des projets à la une (admin).

**Request Body** :
```json
{
  "featured": [
    {
      "fileName": "projet_1.html",
      "position": 1
    },
    {
      "fileName": "projet_2.html",
      "position": 2
    }
  ]
}
```

**Response 200** :
```json
{
  "message": "Configuration saved successfully."
}
```

**Notes** :
- Les positions doivent être uniques (1-4)
- Si un projet est supprimé, sa position est libérée

---

## Logs

### GET /api/logs/logins

Récupère l'historique des connexions (admin).

**Response 200** :
```json
[
  {
    "timestamp": "2025-01-XX",
    "action": "USER_LOGIN",
    "data": {
      "user": "nom_utilisateur",
      "result": "success"
    }
  }
]
```

---

## Statut

### GET /api/status [PUBLIC]

Vérifie le statut de l'API.

**Response 200** :
```json
{
  "status": "ok",
  "message": "Welcome to the BluePrint API"
}
```

---

## Codes d'Erreur

- **200** : Succès
- **201** : Créé avec succès
- **400** : Requête invalide (paramètres manquants, format incorrect)
- **401** : Non authentifié (session expirée)
- **403** : Accès interdit (droits insuffisants)
- **404** : Ressource non trouvée
- **500** : Erreur serveur interne

---

## Exemples d'Utilisation

### JavaScript (Fetch API)

```javascript
// Créer un brouillon
const response = await fetch('/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        titre: 'Mon Projet',
        content: '<p>Contenu</p>',
        tags: ['Informatique']
    })
});
const result = await response.json();

// Lister les projets publiés
const projects = await fetch('/api/projects/published?include_featured=true')
    .then(res => res.json());

// Téléverser un fichier
const formData = new FormData();
formData.append('file', fileInput.files[0]);
const upload = await fetch('/api/upload', {
    method: 'POST',
    body: formData
}).then(res => res.json());
```

### cURL

```bash
# Créer un brouillon
curl -X POST http://localhost:3000/api/drafts \
  -H "Content-Type: application/json" \
  -d '{"titre":"Mon Projet","content":"<p>Contenu</p>","tags":["Informatique"]}'

# Lister les projets
curl http://localhost:3000/api/projects/published

# Téléverser un fichier
curl -X POST http://localhost:3000/api/upload \
  -F "file=@image.jpg"
```

---

**Version API** : 1.0.0  
**Dernière mise à jour** : Janvier 2025

