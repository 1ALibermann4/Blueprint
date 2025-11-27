# Guide de Maintenance - BluePrint

Ce document décrit les tâches de maintenance régulières pour assurer le bon fonctionnement de la plateforme.

## Tâches Automatiques

### 1. Rotation et Nettoyage des Logs

Les logs sont automatiquement rotés lorsqu'ils atteignent 10 MB. Les anciens logs (>30 jours) doivent être nettoyés périodiquement.

#### Exécution Manuelle

```bash
npm run maintenance
```

#### Configuration Cron (Linux)

Ajoutez cette ligne à votre crontab pour exécuter la maintenance quotidiennement à 2h du matin :

```bash
crontab -e
```

```cron
0 2 * * * cd /chemin/vers/Blueprint && npm run maintenance >> /var/log/blueprint-maintenance.log 2>&1
```

### 2. Mise à Jour des Dépendances

#### Vérifier les Mises à Jour Disponibles

```bash
npm run deps:check
```

#### Mettre à Jour les Dépendances (Patches et Mineures)

```bash
npm run deps:update
```

#### Corriger les Vulnérabilités de Sécurité

```bash
npm run deps:audit
```

#### Planification Recommandée

- **Vérification hebdomadaire** : `npm run deps:check`
- **Mise à jour mensuelle** : `npm run deps:update`
- **Audit de sécurité** : Immédiatement après détection de vulnérabilités

### 3. Sauvegarde des Projets

#### Script de Sauvegarde (à créer selon vos besoins)

Créez un script `scripts/backup.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/backups/blueprint"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Sauvegarder les projets
tar -czf $BACKUP_DIR/projects_$DATE.tar.gz \
    blueprint_local/intranet/projects/ \
    blueprint_local/public/projects/

# Sauvegarder les uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
    blueprint_local/public/uploads/

# Sauvegarder les fichiers de configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
    available_tags.json \
    featured_projects.json

# Supprimer les sauvegardes de plus de 30 jours
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Sauvegarde terminée: $DATE"
```

#### Planification Cron

```cron
0 3 * * * /chemin/vers/scripts/backup.sh
```

## Tâches Manuelles

### Vérification Hebdomadaire

1. **Vérifier l'espace disque**
   ```bash
   df -h
   ```

2. **Vérifier la taille des logs**
   ```bash
   du -sh logs/
   ```

3. **Vérifier les erreurs dans les logs**
   ```bash
   tail -n 100 logs/backend-actions.json | grep -i error
   ```

4. **Vérifier les processus PM2**
   ```bash
   pm2 status
   pm2 logs blueprint-app --lines 50
   ```

### Vérification Mensuelle

1. **Mettre à jour les dépendances**
   ```bash
   npm run deps:update
   ```

2. **Vérifier les vulnérabilités**
   ```bash
   npm audit
   ```

3. **Nettoyer les anciens fichiers**
   - Vérifier les uploads non utilisés
   - Nettoyer les brouillons abandonnés (>6 mois)

4. **Réviser les performances**
   - Consulter `PERFORMANCE.md`
   - Vérifier les métriques de charge

## Alertes Recommandées

Configurez des alertes pour :

1. **Espace disque** : < 20% libre
2. **Taille des logs** : > 100 MB
3. **Erreurs répétées** : > 10 erreurs/heure
4. **CPU** : > 80% pendant > 5 minutes
5. **RAM** : > 90% utilisée

## Dépannage

### Logs qui Grandissent Trop Vite

1. Vérifier la fréquence des actions
2. Augmenter la limite de rotation (variable `MAX_LOG_SIZE` dans `logger.js`)
3. Réduire la période de conservation (variable `MAX_LOG_AGE_DAYS`)

### Performances Dégradées

1. Vérifier l'utilisation des ressources : `pm2 monit`
2. Vérifier les logs d'erreur
3. Consulter `PERFORMANCE.md` pour les optimisations
4. Considérer l'ajout d'un cache (voir `PERFORMANCE.md`)

### Problèmes de Noms de Fichiers

Le système de sanitization gère automatiquement :
- Les caractères accentués
- Les caractères spéciaux
- Les doublons

Si des problèmes persistent, vérifier :
- Les permissions du répertoire `drafts/`
- L'espace disque disponible
- Les logs d'erreur

