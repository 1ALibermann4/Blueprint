# Diagramme de Séquence : Publication d'un Projet

Ce diagramme montre la séquence des événements qui se produisent lorsqu'un utilisateur publie un projet.

```mermaid
sequenceDiagram
    participant Client as Utilisateur (Navigateur)
    participant EditorJS as Frontend (editor.js)
    participant Server as Serveur (Express)
    participant FileSystem as Système de Fichiers

    Client->>EditorJS: Clic sur "Soumettre pour relecture"

    EditorJS->>EditorJS: Vérifie si `currentFile` existe
    Note right of EditorJS: Le projet doit d'abord être enregistré comme brouillon.

    EditorJS->>Client: Affiche une boîte de dialogue de confirmation
    Client->>EditorJS: Confirme la publication

    EditorJS->>Server: POST /api/publish (file: currentFile)
    activate Server

    Server->>FileSystem: rename(draft_path, published_path)
    activate FileSystem
    Note over Server,FileSystem: Déplace le fichier .md de `drafts/` à `published/`
    FileSystem-->>Server: Succès
    deactivate FileSystem

    Server-->>EditorJS: Réponse JSON { message: "Projet publié" }
    deactivate Server

    EditorJS->>EditorJS: Appelle resetEditor()
    Note right of EditorJS: Réinitialise les champs du formulaire.

    EditorJS->>Client: Affiche une notification de succès (Notyf)
```

### Description des Étapes

1.  **Action Utilisateur**: L'utilisateur clique sur le bouton "Soumettre pour relecture" dans l'interface de l'éditeur.
2.  **Confirmation**: Le script `editor.js` demande une confirmation à l'utilisateur avant de procéder.
3.  **Appel API**: Une fois la confirmation obtenue, le frontend envoie une requête `POST` à l'endpoint `/api/publish` du serveur, en précisant le nom du fichier à publier.
4.  **Traitement Serveur**: Le serveur reçoit la requête et utilise le module `fs` de Node.js pour déplacer le fichier du répertoire des brouillons (`drafts`) vers le répertoire des projets publiés (`published`).
5.  **Réponse Serveur**: Le serveur renvoie une réponse de succès au format JSON.
6.  **Mise à jour du Frontend**: Le script `editor.js` reçoit la réponse, affiche une notification de succès à l'utilisateur et réinitialise l'éditeur pour permettre la création d'un nouveau projet.