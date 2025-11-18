# Documentation de Déploiement - BluePrint

Ce document explique comment déployer et lancer l'application BluePrint sur un serveur.

## 1. Prérequis

- **Node.js** : Assurez-vous que Node.js est installé sur votre serveur. Vous pouvez vérifier la version avec la commande `node -v`.
- **npm** : Le gestionnaire de paquets de Node.js, généralement installé avec Node.js.

## 2. Installation

1.  **Clonez le dépôt** ou copiez les fichiers du projet sur votre serveur.
2.  **Naviguez jusqu'au répertoire racine** du projet dans votre terminal.
3.  **Installez les dépendances** du projet avec la commande suivante :

    ```bash
    npm install
    ```

## 3. Configuration de l'Authentification (Étape critique)

Pour que l'application fonctionne de manière sécurisée, vous **devez** configurer l'authentification OpenID Connect.

1.  À la racine du projet, créez un fichier nommé `openid-config.js`.
2.  Copiez le contenu ci-dessous dans ce fichier et remplacez les valeurs par vos propres identifiants fournis par votre fournisseur d'identité (EPF, Google, Microsoft, etc.) :

    ```javascript
    module.exports = {
      // L'URL de votre fournisseur OpenID
      issuer: 'URL_DE_VOTRE_FOURNISSEUR',

      // Votre identifiant client
      client_id: 'VOTRE_CLIENT_ID',

      // Votre secret client
      client_secret: 'VOTRE_CLIENT_SECRET',

      // L'URL de redirection (doit correspondre à celle configurée chez votre fournisseur)
      // Pour un déploiement, remplacez 'localhost:3000' par votre nom de domaine.
      redirect_uri: 'http://localhost:3000/auth/callback',

      // Les informations que vous souhaitez demander
      scope: 'openid profile email'
    };
    ```

**Note :** Sans ce fichier, l'application fonctionnera mais l'intranet et la section d'administration ne seront pas protégés par une connexion.

## 4. Démarrage du Serveur

Une fois les dépendances installées et la configuration terminée, vous pouvez démarrer le serveur avec la commande :

```bash
npm start
```

Par défaut, l'application sera accessible à l'adresse `http://localhost:3000`.

Pour un déploiement en production, il est recommandé d'utiliser un gestionnaire de processus comme **PM2** pour garder le serveur en fonctionnement continu.

```bash
# Installer PM2 globalement
npm install pm2 -g

# Démarrer l'application avec PM2
pm2 start server.js --name "blueprint-app"
```

## 5. Configuration en Production (Reverse Proxy)

Pour une intégration transparente avec le site principal de l'école (ou de l'entreprise), il est recommandé de configurer un **reverse proxy** (avec Nginx ou Apache, par exemple) sur le serveur web principal.

Le reverse proxy doit être configuré pour rediriger les requêtes publiques (ex: `https://votre-domaine.com/projets/*`) vers l'application Node.js sur le port où elle est exécutée (ex: `http://localhost:3000/public/*`).

L'intranet d'édition (`/intranet`) peut rester accessible directement via l'adresse IP et le port du serveur EnergyLab, car il est destiné à un usage interne.
