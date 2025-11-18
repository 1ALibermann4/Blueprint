# Workflow de l'Authentification à la Publication d'un Projet

Ce document décrit le parcours complet d'un projet, depuis la connexion de l'étudiant jusqu'à sa publication et sa consultation sur le site public.

```mermaid
sequenceDiagram
    actor Etudiant
    participant Navigateur as Frontend
    participant Serveur as Backend (Node.js)
    participant OpenID
    participant FileSystem as Système de Fichiers

    %% 1. Phase d'Authentification
    Note over Etudiant, Serveur: Phase 1: Authentification
    Etudiant->>Navigateur: Accède à l'intranet (ex: /intranet/brouillons.html)
    Navigateur->>Serveur: Requête pour une page protégée
    Serveur-->>Navigateur: Redirection vers /login (si pas authentifié)
    Navigateur->>Serveur: GET /login
    Serveur-->>OpenID: Redirige l'utilisateur vers le fournisseur OpenID
    Etudiant->>OpenID: Se connecte avec ses identifiants
    OpenID-->>Serveur: Redirige avec un code d'autorisation via /auth/callback
    Serveur->>OpenID: Echange le code contre un token d'accès
    OpenID-->>Serveur: Renvoie le token et les informations utilisateur
    Serveur->>Serveur: Crée une session pour l'Etudiant
    Serveur-->>Navigateur: Redirige vers la page des brouillons (/intranet/brouillons.html)
    Navigateur-->>Etudiant: Affiche la page de gestion des brouillons

    %% 2. Phase de Création / Édition
    Note over Etudiant, Serveur: Phase 2: Création et Édition
    Etudiant->>Navigateur: Clique sur "Nouveau Projet" ou "Modifier"
    Navigateur->>Serveur: GET /intranet/editor.html
    alt Nouveau Projet
        Navigateur->>Serveur: GET /api/templates/project
        Serveur->>FileSystem: Lit page_projet.html
        Serveur-->>Navigateur: Renvoie le template HTML
    else Brouillon Existant
        Navigateur->>Serveur: GET /api/project?file=mon_projet.md
        Serveur->>FileSystem: Lit le fichier .md du brouillon
        Serveur-->>Navigateur: Renvoie le contenu (metadata + HTML)
    end
    Navigateur-->>Etudiant: Affiche l'éditeur visuel

    Etudiant->>Navigateur: Modifie le contenu (texte, images...)
    opt Téléversement d'image
        Navigateur->>Serveur: POST /api/upload (avec le fichier image)
        Serveur->>FileSystem: Sauvegarde l'image dans /public/uploads
        Serveur-->>Navigateur: Renvoie l'URL de l'image (ex: /uploads/image.jpg)
        Navigateur->>Navigateur: Met à jour l'attribut 'src' de l'image dans l'éditeur
    end

    %% 3. Phase de Sauvegarde
    Note over Etudiant, Serveur: Phase 3: Sauvegarde du Brouillon
    Etudiant->>Navigateur: Clique sur "Enregistrer et quitter"
    Navigateur->>Navigateur: Nettoie le HTML (retire les classes et boutons d'édition)
    Navigateur->>Serveur: POST /api/drafts (avec titre, tags, et contenu HTML propre)
    Serveur->>FileSystem: Crée ou met à jour le fichier .md dans /intranet/projects/drafts
    Serveur-->>Navigateur: Répond avec succès
    Navigateur-->>Etudiant: Redirige vers la page des brouillons

    %% 4. Phase de Publication
    Note over Etudiant, Serveur: Phase 4: Publication
    Etudiant->>Navigateur: Sur brouillons.html, clique sur "Soumettre"
    Navigateur->>Serveur: POST /api/publish (avec le nom du fichier .md)
    Serveur->>FileSystem: 1. Lit le brouillon .md depuis le dossier 'drafts'
    Serveur->>FileSystem: 2. Crée un nouveau fichier .html avec le contenu dans /public/projects/published
    Serveur->>FileSystem: 3. Déplace le fichier .md original vers /intranet/projects/published_md (archivage)
    Serveur-->>Navigateur: Répond avec succès
    Navigateur->>Navigateur: Met à jour la liste des brouillons (retire le projet publié)
    Navigateur-->>Etudiant: Affiche la liste mise à jour

    %% 5. Phase de Consultation
    actor Visiteur
    Note over Visiteur, Serveur: Phase 5: Consultation Publique
    Visiteur->>Navigateur: Accède à la liste des projets (/public/project_list.html)
    Navigateur->>Serveur: GET /api/projects/published
    Serveur->>FileSystem: Lit les métadonnées (titre, tags) depuis les fichiers .md dans 'published_md'
    Serveur-->>Navigateur: Renvoie la liste des projets
    Navigateur-->>Visiteur: Affiche la grille des projets

    Visiteur->>Navigateur: Clique sur un projet
    Navigateur->>Serveur: GET /public/projects/published/nom_projet.html
    Serveur-->>Navigateur: Sert le fichier HTML statique correspondant
    Navigateur-->>Visiteur: Affiche la page du projet final
```
