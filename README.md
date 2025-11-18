# Projet BluePrint

BluePrint est un outil de gestion de projets basé sur des fichiers, conçu pour permettre aux étudiants de créer, soumettre et publier facilement des pages de projet sans avoir à écrire de code.

## Fonctionnalités Clés

- **Éditeur Visuel Intuitif (WYSIWYG)** : Un éditeur de texte riche qui permet aux utilisateurs de modifier la page du projet directement, en voyant le résultat final au fur et à mesure de la frappe.
- **Support de Contenu Riche** : Prise en charge complète du formatage de texte (gras, listes, tableaux), des hyperliens et de l'intégration d'images et de vidéos.
- **Gestion Dynamique des Participants** : Ajoutez ou supprimez facilement des membres du projet (étudiants, encadrants) directement depuis l'interface visuelle.
- **Connexion Simulée** : Un système de connexion simulé est en place pour le développement, permettant de contourner la configuration OpenID.
- **Workflow de Relecture Robuste** :
    - Les étudiants créent et gèrent leurs `brouillons`.
    - Les brouillons sont `soumis pour relecture` et passent au statut `en attente de relecture`.
    - Les administrateurs examinent les soumissions, puis les `publient` ou les `rejettent`.
    - Les projets `rejetés` peuvent être modifiés et soumis à nouveau par les étudiants.
- **Téléversement d'Images** : Un processus fluide pour téléverser et intégrer des médias dans les rapports de projet.

## Structure du Projet

Le projet est une application Node.js utilisant le framework Express.

- `server.js` : Le fichier serveur principal qui gère le routage, l'authentification simulée et la logique des API.
- `blueprint_local/` : Contient tous les fichiers frontend (`intranet`, `public`, `admin`).
- `documentation/` : Contient les diagrammes techniques et les descriptions du workflow.

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
    - **Page de connexion (simulée)** : Accédez à `http://localhost:3000/login.html` et entrez n'importe quel nom d'utilisateur pour vous "connecter".
    - **Gérer vos projets** : Après la connexion, vous arriverez sur la page de gestion des brouillons à `http://localhost:3000/intranet/brouillons.html`.
    - **Créer ou modifier un projet** : Depuis la page des brouillons, cliquez sur "Nouveau Projet" ou "Modifier" pour accéder à l'éditeur visuel.
    - **Panneau d'administration** : Visitez `http://localhost:3000/admin/validate.html` pour examiner et valider les projets en attente.
    - **Voir les projets publiés** : Visitez `http://localhost:3000/public/projects.html`.

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
