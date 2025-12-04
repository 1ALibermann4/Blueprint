# Projet BluePrint

BluePrint est un outil de gestion de projets basé sur des fichiers, conçu pour permettre aux étudiants de créer, soumettre et publier facilement des pages de projet sans avoir à écrire de code.

> 📖 **Documentation complète** : Voir [DOCUMENTATION.md](./DOCUMENTATION.md) pour une documentation exhaustive du projet.

## Fonctionnalités Clés

### Interface Utilisateur
- **Éditeur Visuel Intuitif (WYSIWYG)** : Un éditeur de texte riche basé sur TinyMCE qui permet aux utilisateurs de modifier la page du projet directement, en voyant le résultat final au fur et à mesure de la frappe.
- **Support de Contenu Riche** : Prise en charge complète du formatage de texte (gras, listes, tableaux), des hyperliens et de l'intégration d'images et de vidéos.
- **Gestion Dynamique des Participants** : Ajoutez ou supprimez facilement des membres du projet (étudiants, encadrants) directement depuis l'interface visuelle avec photos et informations.
- **Galerie Multimédia** : Téléversement et gestion d'images, vidéos et PDFs dans une galerie dédiée.

### Pages Publiques
- **Page d'Accueil** : Affichage des projets mis en avant avec système de positions (1 pour le projet principal, 2-3-4 pour les projets secondaires).
- **Liste des Projets** : Affichage de tous les projets publiés avec filtrage par tags/thèmes.
- **Images de Présentation** : Chargement automatique des images de présentation des projets, avec carousel automatique des images multimédias en fallback.

### Système de Tags
- **Tags Dynamiques** : Les tags sont gérés de manière centralisée et s'ajoutent automatiquement lors de la publication de projets.
- **Filtrage par Tags** : Filtrage des projets par thèmes/tags sur la page d'accueil et la liste des projets.

### Workflow de Publication
- **Workflow de Relecture Robuste** :
    - Les étudiants créent et gèrent leurs `brouillons`.
    - Les brouillons sont `soumis pour relecture` et passent au statut `en attente de relecture`.
    - Les administrateurs examinent les soumissions, puis les `publient` ou les `rejettent`.
    - Les projets `rejetés` peuvent être modifiés et soumis à nouveau par les étudiants.
- **Projets à la Une** : Système de mise en avant des projets avec positions numérotées (1-4) pour l'affichage sur la page d'accueil.

### Authentification
- **Connexion Simulée** : Un système de connexion simulé est en place pour le développement, permettant de contourner la configuration OpenID.
- **OpenID Connect** : Support pour l'authentification OpenID Connect (configuration optionnelle).

## Déploiement

### Déploiement rapide avec Podman

BluePrint peut être déployé facilement avec Podman :

```bash
# 1. Configurer l'environnement
cp .env.example .env
nano .env  # Modifier les variables (notamment SESSION_SECRET)

# 2. Rendre les scripts exécutables
chmod +x deploy/*.sh

# 3. Vérifier l'environnement
./deploy/check.sh

# 4. Construire et déployer
./deploy/build.sh
./deploy/deploy.sh
```

📖 **Guide complet** : Voir [documentation/deployment/QUICK_START.md](./documentation/deployment/QUICK_START.md) pour un guide de démarrage rapide ou [documentation/deployment/DEPLOYMENT_PODMAN.md](./documentation/deployment/DEPLOYMENT_PODMAN.md) pour la documentation complète.

### Autres méthodes de déploiement

- **Sans conteneur** : Voir [documentation/deployment/DEPLOYMENT.md](./documentation/deployment/DEPLOYMENT.md)
- **Avec PM2** : Voir [documentation/deployment/DEPLOYMENT.md](./documentation/deployment/DEPLOYMENT.md#5-production-avec-pm2)

## Structure du Projet

Le projet est une application Node.js utilisant le framework Express.

```
Blueprint/
├── server.js                    # Serveur principal Express
├── package.json                  # Dépendances et scripts
├── available_tags.json          # Tags/thèmes disponibles
├── featured_projects.json       # Projets mis en avant
├── blueprint_local/
│   ├── intranet/               # Interface d'édition (étudiants)
│   │   ├── editor.html         # Éditeur WYSIWYG
│   │   ├── brouillons.html     # Gestion des brouillons
│   │   ├── projects/
│   │   │   ├── drafts/         # Brouillons (Markdown)
│   │   │   └── published_md/   # Projets publiés (Markdown)
│   │   └── scripts/
│   ├── admin/                  # Interface d'administration
│   │   ├── validate.html      # Validation des projets
│   │   └── review.html        # Aperçu des projets
│   ├── public/                 # Pages publiques
│   │   ├── page_accueil.html   # Page d'accueil
│   │   ├── project_list.html   # Liste des projets
│   │   ├── projects/
│   │   │   └── published/     # Projets publiés (HTML)
│   │   ├── templates/
│   │   │   └── page_projet.html # Template de projet
│   │   ├── scripts/            # Scripts JavaScript frontend
│   │   ├── images/             # Images statiques
│   │   └── uploads/           # Médias téléversés
│   └── styles/                 # Fichiers CSS
├── documentation/              # Documentation technique (voir documentation/README.md)
│   ├── deployment/            # Guides de déploiement
│   ├── security/              # Documentation sécurité
│   ├── architecture/          # Architecture technique
│   ├── development/           # Guides développeur
│   ├── maintenance/           # Maintenance
│   ├── performance/            # Performance
│   └── workflows/             # Workflows métier
└── temp/                      # Fichiers temporaires (dev)
```

## Pour Commencer

### Prérequis

- [Node.js](https://nodejs.org/) (qui inclut npm)
- Un navigateur web moderne

### Installation et Utilisation

1.  **Clonez le dépôt** :
    ```bash
    git clone https://github.com/1ALibermann4/Blueprint.git
    cd Blueprint
    ```

2.  **Installez les dépendances** :
    ```bash
    npm install
    ```

3.  **Démarrez le serveur** :
    ```bash
    npm start
    ```
    Le serveur fonctionnera à l'adresse `http://localhost:3000`.

4.  **Accéder à l'Application** :
    - **Page d'accueil publique** : `http://localhost:3000/page_accueil.html`
    - **Liste des projets** : `http://localhost:3000/public/project_list.html`
    - **Page de connexion (simulée)** : `http://localhost:3000/login.html` - Entrez n'importe quel nom d'utilisateur pour vous "connecter".
    - **Gérer vos projets** : Après la connexion, vous arriverez sur la page de gestion des brouillons à `http://localhost:3000/intranet/brouillons.html`.
    - **Créer ou modifier un projet** : Depuis la page des brouillons, cliquez sur "Nouveau Projet" ou "Modifier" pour accéder à l'éditeur visuel.
    - **Panneau d'administration** : Visitez `http://localhost:3000/admin/validate.html` pour examiner et valider les projets en attente.

## Documentation Complète

📚 **Toute la documentation est organisée dans le dossier [`documentation/`](./documentation/README.md)**

### Documentation principale
- **[documentation/README.md](./documentation/README.md)** - Index de toute la documentation
- **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Vue d'ensemble du projet

### Par thème
- **🚀 [Déploiement](./documentation/deployment/)** - Guides de déploiement (Podman, PM2, etc.)
- **🔒 [Sécurité](./documentation/security/)** - Sécurité et améliorations
- **🏗️ [Architecture](./documentation/architecture/)** - Architecture technique
- **💻 [Développement](./documentation/development/)** - Guides développeur et API
- **🔧 [Maintenance](./documentation/maintenance/)** - Maintenance et exploitation
- **⚡ [Performance](./documentation/performance/)** - Optimisations
- **🔄 [Workflows](./documentation/workflows/)** - Flux de travail métier

## Fonctionnement du Workflow

1.  **Connexion** : L'étudiant utilise la page `login.html` pour démarrer une session.
2.  **Gestion des Brouillons** :
    - Sur la page `brouillons.html`, l'étudiant voit tous ses projets avec leur statut (`Brouillon`, `En attente de relecture`, `Rejeté`).
    - Il peut créer un nouveau projet ou modifier un brouillon existant (uniquement s'il a le statut `Brouillon` ou `Rejeté`).
3.  **Édition** :
    - L'éditeur charge une représentation visuelle de la page du projet final.
    - L'étudiant clique directement sur n'importe quel texte ou image pour le modifier.
    - Il peut sauvegarder son travail à tout moment (`Enregistrer et quitter`) ou le soumettre pour validation (`Soumettre pour relecture`).
4.  **Relecture par l'Administrateur** :
    - Les projets soumis apparaissent dans le panneau d'administration (`validate.html`).
    - L'administrateur peut `Relire` un projet pour voir un aperçu fidèle, puis le `Valider` (publier) ou le `Rejeter`.
5.  **Publication** :
    - Les projets validés sont convertis en fichiers HTML statiques et deviennent publiquement accessibles sur la page `projects.html`.
