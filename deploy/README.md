# Scripts de Déploiement BluePrint

Ce dossier contient tous les scripts nécessaires pour déployer BluePrint avec Podman.

## Scripts disponibles

### `check.sh` - Vérification pré-déploiement
Vérifie que l'environnement est prêt pour le déploiement.

```bash
./deploy/check.sh
```

Vérifie :
- Installation de Podman
- Présence des fichiers essentiels
- Configuration du fichier `.env`
- Permissions des scripts

### `build.sh` - Construction de l'image
Construit l'image Podman de l'application.

```bash
./deploy/build.sh
```

Options :
- Demande un tag pour l'image (par défaut: `latest`)
- Vérifie que Podman est installé
- Construit l'image depuis `Containerfile`

### `deploy.sh` - Déploiement complet
Déploie l'application BluePrint.

```bash
./deploy/deploy.sh
```

Actions :
- Vérifie la configuration (`.env`)
- Construit l'image si nécessaire
- Arrête le conteneur existant
- Crée les répertoires nécessaires
- Démarre le conteneur
- Vérifie le health check

### `stop.sh` - Arrêt du conteneur
Arrête et optionnellement supprime le conteneur.

```bash
./deploy/stop.sh
```

### `restart.sh` - Redémarrage
Redémarre le conteneur en cours d'exécution.

```bash
./deploy/restart.sh
```

### `logs.sh` - Consultation des logs
Affiche les logs du conteneur.

```bash
./deploy/logs.sh          # Dernières 50 lignes
./deploy/logs.sh -f       # Suivre en temps réel
```

### `update.sh` - Mise à jour
Met à jour l'application en sauvegardant les données.

```bash
./deploy/update.sh
```

Actions :
- Sauvegarde automatique des données
- Reconstruction de l'image
- Redémarrage du conteneur

## Utilisation

### Première installation

1. **Vérifier l'environnement** :
   ```bash
   ./deploy/check.sh
   ```

2. **Configurer `.env`** :
   ```bash
   cp .env.example .env
   nano .env
   ```
   ⚠️ **Important** : Modifiez `SESSION_SECRET` avec un secret fort !

3. **Rendre les scripts exécutables** (sur Linux) :
   ```bash
   chmod +x deploy/*.sh
   ```

4. **Construire et déployer** :
   ```bash
   ./deploy/build.sh
   ./deploy/deploy.sh
   ```

### Mise à jour

```bash
./deploy/update.sh
```

### Gestion quotidienne

```bash
# Voir les logs
./deploy/logs.sh -f

# Redémarrer
./deploy/restart.sh

# Arrêter
./deploy/stop.sh
```

## Structure des volumes

Les données suivantes sont persistées via des volumes :

- `blueprint_local/` : Tous les projets (drafts et publiés)
- `logs/` : Fichiers de log
- `rejection_reasons.json` : Motifs de rejet
- `available_tags.json` : Tags disponibles
- `featured_projects.json` : Projets à la une

## Dépannage

### Les scripts ne sont pas exécutables

Sur Linux :
```bash
chmod +x deploy/*.sh
```

### Erreur de permissions SELinux

Les volumes utilisent le flag `:Z` pour SELinux. Si vous avez des erreurs :
```bash
# Vérifier les permissions
ls -la blueprint_local/

# Si nécessaire, ajuster les permissions
chcon -Rt svirt_sandbox_file_t blueprint_local/
```

### Le conteneur ne démarre pas

```bash
# Voir les logs d'erreur
./deploy/logs.sh

# Vérifier le statut
podman ps -a | grep blueprint-app
```

### Port déjà utilisé

```bash
# Vérifier quel processus utilise le port
sudo lsof -i :8000

# Ou changer le port dans .env et podman-compose.yml
```

## Documentation

- **Guide rapide** : [`../documentation/deployment/QUICK_START.md`](../documentation/deployment/QUICK_START.md)
- **Déploiement détaillé** : [`../documentation/deployment/DEPLOYMENT_PODMAN.md`](../documentation/deployment/DEPLOYMENT_PODMAN.md)
- **Checklist** : [`../documentation/deployment/DEPLOYMENT_CHECKLIST.md`](../documentation/deployment/DEPLOYMENT_CHECKLIST.md)
- **Sécurité** : [`../documentation/security/SECURITY_IMPROVEMENTS.md`](../documentation/security/SECURITY_IMPROVEMENTS.md)
- **Index documentation** : [`../documentation/README.md`](../documentation/README.md)

