# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [1.0.0] - 2025-01-XX

### Ajouté

- **Système de gestion des noms de fichiers**
  - Sanitization avec normalisation des accents (é → e, à → a, etc.)
  - Détection et résolution automatique des doublons
  - Génération de noms de fichiers uniques avec suffixe numérique
  - Support des caractères spéciaux et internationalisation

- **Système de rotation des logs**
  - Rotation automatique à 10 MB (configurable)
  - Conservation de 5 fichiers maximum
  - Nettoyage automatique des logs anciens (>30 jours)
  - Prévention de la saturation du disque

- **Scripts de maintenance**
  - `scripts/update-dependencies.js` : Mise à jour des dépendances
  - `scripts/maintenance.js` : Nettoyage périodique
  - Scripts npm pour faciliter la maintenance

- **Documentation de performance**
  - Analyse pour 100 utilisateurs simultanés
  - Identification des goulots d'étranglement
  - Recommandations d'optimisation
  - Guide de maintenance (`MAINTENANCE.md`)

### Modifié
- **Page d'accueil** (`page_accueil.html`) avec affichage des projets mis en avant
  - Projet principal en position 1 (vidéo/image + description)
  - Projets secondaires en positions 2, 3, 4 (liste verticale)
  - Système de tags/thèmes dynamiques pour filtrage
  - Carousel automatique des images multimédias si pas d'image de présentation

- **Page liste des projets** (`project_list.html`) améliorée
  - Affichage en grille des projets publiés
  - Filtrage par tags/thèmes
  - Images de présentation automatiques avec carousel en fallback
  - Recherche et tri des projets

- **Système de tags dynamiques**
  - Gestion centralisée des tags dans `available_tags.json`
  - Ajout automatique des nouveaux tags lors de la publication
  - API REST pour la gestion des tags (`/api/tags`)

- **Système de projets à la une**
  - Gestion des positions (1-4) pour les projets mis en avant
  - Stockage dans `featured_projects.json`
  - Interface admin pour définir les projets à la une

- **Amélioration de l'éditeur WYSIWYG**
  - Chargement du template complet avec header/footer
  - Édition directe du titre dans le bandeau
  - Gestion améliorée des images et médias
  - Support des tableaux éditable

- **Images de présentation intelligentes**
  - Extraction automatique de l'image de présentation depuis la section Accueil
  - Fallback vers la galerie multimedia
  - Carousel automatique si plusieurs images disponibles

### Modifié
- Refonte complète des templates HTML avec Bulma CSS
- Amélioration de la structure des fichiers CSS
- Correction des chemins d'images et des assets statiques
- Amélioration de la gestion des sessions

### Corrigé
- Correction de l'affichage du template dans l'éditeur
- Correction des erreurs TinyMCE sur les éléments dynamiques
- Correction de la duplication des headers/footers dans les pages publiées
- Correction du chargement des projets sur la page d'accueil
- Correction des chemins d'images et de scripts

### Documentation
- Mise à jour du README.md avec les nouvelles fonctionnalités
- Amélioration de DEPLOYMENT.md
- Création de CHANGELOG.md
- Amélioration du .gitignore

