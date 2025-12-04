# Checklist de Déploiement BluePrint

Checklist complète pour déployer BluePrint avec Podman en production.

## Pré-déploiement

### Environnement serveur
- [ ] Podman installé et fonctionnel
- [ ] Podman-compose installé (optionnel mais recommandé)
- [ ] Node.js installé (pour générer SESSION_SECRET)
- [ ] Accès au serveur (SSH ou local)
- [ ] Port 8000 disponible
- [ ] Reverse proxy configuré pour rediriger vers port 8000

### Configuration
- [ ] Fichier `.env` créé depuis `.env.example`
- [ ] `SESSION_SECRET` généré et configuré (secret fort et unique)
- [ ] `BASE_URL` configuré avec l'URL complète (https://blueprintlab.mde.epf.fr)
- [ ] `PORT=8000` configuré
- [ ] `NODE_ENV=production` configuré
- [ ] `TRUST_PROXY=true` configuré

### Fichiers et répertoires
- [ ] Tous les fichiers du projet présents
- [ ] Scripts de déploiement dans `deploy/`
- [ ] Scripts rendus exécutables (`chmod +x deploy/*.sh`)
- [ ] Répertoires créés ou prêts à être créés :
  - [ ] `blueprint_local/public/uploads/`
  - [ ] `blueprint_local/intranet/projects/drafts/`
  - [ ] `blueprint_local/public/projects/published/`
  - [ ] `logs/`

### Vérification
- [ ] Exécuter `./deploy/check.sh` sans erreurs
- [ ] Tous les fichiers essentiels présents
- [ ] Configuration `.env` complète

## Déploiement

### Construction
- [ ] Exécuter `./deploy/build.sh`
- [ ] Image construite sans erreurs
- [ ] Image taguée correctement

### Déploiement
- [ ] Exécuter `./deploy/deploy.sh`
- [ ] Conteneur démarré avec succès
- [ ] Health check réussi (`/api/health`)
- [ ] Logs sans erreurs critiques

### Vérification post-déploiement
- [ ] Application accessible sur le port 8000
- [ ] Health check répond correctement :
  ```bash
  curl http://localhost:8000/api/health
  ```
- [ ] Pages publiques accessibles :
  - [ ] Page d'accueil
  - [ ] Liste des projets
- [ ] Interface intranet accessible (si authentification configurée)
- [ ] Interface admin accessible (si authentification configurée)

## Configuration du reverse proxy

### Nginx (exemple)
- [ ] Configuration créée pour `blueprintlab.mde.epf.fr`
- [ ] Upstream configuré vers `localhost:8000`
- [ ] Headers `X-Forwarded-*` configurés
- [ ] SSL/TLS configuré (géré en amont)
- [ ] Test de la configuration : `nginx -t`
- [ ] Reverse proxy redémarré/rechargé

### Vérification
- [ ] Application accessible via le domaine (https://blueprintlab.mde.epf.fr)
- [ ] HTTPS fonctionne correctement
- [ ] Redirections fonctionnent
- [ ] Cookies sécurisés (vérifier dans les DevTools)

## Sécurité

### Authentification
- [ ] Authentification activée (si nécessaire)
- [ ] OpenID Connect configuré (si utilisé)
- [ ] `checkAuth` activé dans `server.js` (si nécessaire)

### Secrets
- [ ] `SESSION_SECRET` fort et unique
- [ ] Fichier `.env` non versionné (dans `.gitignore`)
- [ ] Permissions du fichier `.env` restreintes (chmod 600)

### Firewall
- [ ] Port 8000 accessible uniquement depuis le reverse proxy
- [ ] Accès direct au port 8000 bloqué depuis Internet
- [ ] Seul le reverse proxy est accessible depuis Internet

## Monitoring

### Logs
- [ ] Logs accessibles : `./deploy/logs.sh`
- [ ] Rotation des logs configurée (optionnel)
- [ ] Surveillance des erreurs

### Health check
- [ ] Route `/api/health` fonctionnelle
- [ ] Health check du conteneur actif
- [ ] Monitoring configuré (optionnel)

## Sauvegardes

### Configuration initiale
- [ ] Sauvegarde des fichiers de configuration :
  - [ ] `.env`
  - [ ] `rejection_reasons.json`
  - [ ] `available_tags.json`
  - [ ] `featured_projects.json`
- [ ] Sauvegarde de la structure `blueprint_local/`

### Planification
- [ ] Script de sauvegarde créé (optionnel)
- [ ] Planification des sauvegardes (cron, etc.)
- [ ] Test de restauration effectué

## Maintenance

### Scripts
- [ ] Scripts de déploiement testés
- [ ] Documentation à jour
- [ ] Procédures documentées

### Mises à jour
- [ ] Processus de mise à jour testé (`./deploy/update.sh`)
- [ ] Procédure de rollback documentée

## Post-déploiement

### Tests fonctionnels
- [ ] Création d'un projet test
- [ ] Soumission pour relecture
- [ ] Validation et publication
- [ ] Affichage sur la page publique
- [ ] Upload de fichiers multimédias
- [ ] Rejet avec motif (si applicable)

### Performance
- [ ] Temps de chargement acceptable
- [ ] Upload de fichiers fonctionnel
- [ ] Pas d'erreurs dans les logs

### Documentation
- [ ] URL d'accès documentée
- [ ] Credentials d'accès documentés (si nécessaire)
- [ ] Procédures de maintenance documentées

## Notes

- ⚠️ **Important** : Ne jamais commiter le fichier `.env` dans Git
- ⚠️ **Important** : Générer un `SESSION_SECRET` unique et fort
- ⚠️ **Important** : Vérifier que le reverse proxy passe bien les headers `X-Forwarded-*`
- ✅ Les données sont persistées via des volumes, elles survivent aux redémarrages
- ✅ Le conteneur redémarre automatiquement en cas d'erreur (`restart: unless-stopped`)

## Support

En cas de problème :
1. Vérifier les logs : `./deploy/logs.sh -f`
2. Vérifier le health check : `curl http://localhost:8000/api/health`
3. Consulter la documentation :
   - [Guide rapide](./QUICK_START.md)
   - [Déploiement Podman](./DEPLOYMENT_PODMAN.md)
   - [Sécurité](../security/SECURITY_IMPROVEMENTS.md)
   - [Index documentation](../README.md)

