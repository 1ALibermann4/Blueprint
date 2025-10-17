# Diagramme de Classes

Ce diagramme illustre les principaux composants de l'application BluePrint et leurs interactions.

```mermaid
classDiagram
    direction LR

    class Client {
        <<Navigateur>>
        +InteractionUtilisateur()
        +EnvoiRequetesAPI()
    }

    class Frontend {
        <<JavaScript Client>>
        -currentFile: String
        +updatePreview()
        +saveDraft()
        +loadDraft()
        +submitForReview()
    }

    class ExpressServer {
        <<server.js>>
        +app.use(middleware)
        +app.get(route, handler)
        +app.post(route, handler)
        +app.listen(port)
    }

    class ApiRoutes {
        <<Router Express>>
        +GET /api/projects/drafts
        +GET /api/project
        +POST /api/drafts
        +POST /api/publish
    }

    class FsModule {
        <<Node.s fs>>
        +readdir()
        +readFile()
        +writeFile()
        +rename()
        +mkdir()
    }

    class MarkdownTools {
        <<Bibliothèques>>
        +gray-matter.parse()
        +gray-matter.stringify()
        +markdown-it.render()
    }

    class ProjectFile {
        <<Fichier .md>>
        -frontMatter: Object
        -content: String
    }

    Client --> Frontend : "utilise"
    Frontend --> ApiRoutes : "appelle via fetch()"
    ExpressServer o-- ApiRoutes : "définit"
    ApiRoutes --> FsModule : "opère sur"
    ApiRoutes --> MarkdownTools : "utilise pour traiter"
    FsModule "1" -- "many" ProjectFile : "gère"
    MarkdownTools ..> ProjectFile : "traite le contenu de"

```

### Description des Composants

*   **Client**: Le navigateur web de l'utilisateur qui accède à l'application.
*   **Frontend**: Le code JavaScript (`editor.js`, `preview.js`) qui s'exécute dans le navigateur pour gérer l'interface, la logique de l'éditeur et les appels à l'API.
*   **ExpressServer**: Le serveur Node.js principal (`server.js`) qui exécute l'application, sert les fichiers statiques et gère les routes.
*   **ApiRoutes**: Les points de terminaison de l'API définis dans le serveur pour gérer les projets (créer, lister, publier).
*   **FsModule**: Le module `fs` (File System) de Node.js, utilisé par le serveur pour lire et écrire les fichiers de projet sur le disque.
*   **MarkdownTools**: Les bibliothèques `gray-matter` et `markdown-it` utilisées pour analyser (parser) et générer les fichiers au format Markdown avec Front Matter.
*   **ProjectFile**: Représente un fichier de projet (`.md`) sur le disque, contenant les métadonnées (Front Matter) et le contenu principal.