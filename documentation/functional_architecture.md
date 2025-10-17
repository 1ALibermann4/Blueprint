# Architecture Fonctionnelle de BluePrint

Ce document décrit l'architecture fonctionnelle de haut niveau de l'application BluePrint. L'application est divisée en trois zones principales, chacune avec un rôle et un public spécifiques.

```mermaid
graph TD
    subgraph "Utilisateurs Externes (Public)"
        A[Visiteur du site] --> B{Zone Publique};
    end

    subgraph "Utilisateurs Internes (Contributeurs)"
        C[Contributeur / Étudiant] --> D{Zone Intranet};
    end

    subgraph "Administrateurs"
        E[Administrateur] --> F{Zone Admin};
        E --> D; % Les admins peuvent aussi être des contributeurs
    end

    B --- G((Base de Fichiers .md));
    D --- G;
    F --- G;

    D -- "Sauvegarde Brouillon" --> H(Dossier /drafts);
    D -- "Soumet pour relecture" --> I(Déplacement vers /published);
    F -- "Valide et Publie" --> I;
    B -- "Lit les Projets" --> J(Dossier /published);

    H -- "fs.rename()" --> J;

    style B fill:#cff,stroke:#333,stroke-width:2px
    style D fill:#fcf,stroke:#333,stroke-width:2px
    style F fill:#ffc,stroke:#333,stroke-width:2px

```

### 1. Zone Publique

*   **Rôle**: Présenter les projets finalisés et publiés à un large public (par exemple, sur le site web de l'école ou de l'entreprise).
*   **Accès**: Ouvert à tous, sans authentification.
*   **Fonctionnalités Clés**:
    *   Liste des projets publiés.
    *   Affichage détaillé de chaque projet.
    *   (Potentiellement) un moteur de recherche pour naviguer dans les projets.
*   **Source des données**: Lit exclusivement les fichiers `.md` du répertoire `blueprint_local/public/projects/published`.

### 2. Zone Intranet

*   **Rôle**: Permettre aux contributeurs (étudiants, membres de l'équipe) de créer, éditer et gérer leurs brouillons de projet.
*   **Accès**: Protégé et nécessite une authentification (actuellement désactivée pour le développement).
*   **Fonctionnalités Clés**:
    *   Éditeur de projet riche (basé sur TinyMCE et des champs de métadonnées).
    *   Prévisualisation en temps réel.
    *   Sauvegarde des brouillons.
    *   Chargement des brouillons existants.
    *   Soumission d'un projet pour relecture/publication.
*   **Source des données**: Lit et écrit les fichiers `.md` dans le répertoire `blueprint_local/intranet/projects/drafts`.

### 3. Zone Admin

*   **Rôle**: Permettre aux administrateurs de relire les projets soumis, de les valider et de les publier sur le site public.
*   **Accès**: Strictement réservé aux administrateurs, nécessite une authentification avec des droits élevés.
*   **Fonctionnalités Clés**:
    *   Liste des projets en attente de validation.
    *   Interface de relecture pour visualiser un projet tel qu'il apparaîtrait une fois publié.
    *   Boutons pour "Approuver" ou "Rejeter" un projet.
*   **Source des données**: Lit les projets soumis (actuellement depuis `drafts`, conceptuellement depuis un dossier `pending`) et les déplace vers `published`.

### Interactions et Flux de Données

Le cœur du système est une **base de fichiers Markdown**. Le flux principal est le suivant :
1.  Un **Contributeur** crée un projet dans l'**Intranet**. Le fichier est sauvegardé dans `/drafts`.
2.  Une fois prêt, le contributeur **soumet** le projet.
3.  L'action de soumission déplace le fichier vers la zone de traitement de l'**Admin**. Dans l'implémentation actuelle, il est directement déplacé vers `/published`.
4.  Un **Administrateur** (dans une future itération) valide le projet.
5.  Le projet publié dans `/published` devient visible pour les **Visiteurs** sur la **Zone Publique**.