# Analyse de Performance - BluePrint

## Estimation pour 100 Utilisateurs Simultanés

### Scénario de Charge

**100 utilisateurs simultanés** avec la répartition suivante :
- 70% consultation (lecture de projets publiés, page d'accueil)
- 20% édition (création/modification de brouillons)
- 10% administration (validation, publication)

### Métriques Estimées

#### Requêtes par Seconde (RPS)
- **Consultation** : ~35-50 RPS (pages statiques, API de liste)
- **Édition** : ~5-10 RPS (sauvegarde, upload)
- **Admin** : ~2-5 RPS (validation, publication)
- **Total estimé** : ~42-65 RPS

#### Utilisation des Ressources

**CPU** :
- Lecture de fichiers : ~10-20% (I/O bound)
- Génération HTML : ~5-10% (par publication)
- Parsing Markdown : ~2-5% (par requête)
- **Total estimé** : ~20-40% CPU

**Mémoire (RAM)** :
- Node.js de base : ~100-150 MB
- Sessions (100 utilisateurs) : ~10-20 MB
- Cache de templates : ~5-10 MB
- Buffer de fichiers : ~20-50 MB
- **Total estimé** : ~150-250 MB

**Disque (I/O)** :
- Lecture de projets : ~50-100 IOPS
- Écriture de logs : ~10-20 IOPS
- Sauvegarde de brouillons : ~5-10 IOPS
- **Total estimé** : ~65-130 IOPS

### Goulots d'Étranglement Identifiés

#### 1. Système de Logs (CRITIQUE)
**Problème actuel** :
- Lecture/écriture complète du fichier JSON à chaque action
- Pas de rotation automatique
- Croissance illimitée

**Impact** :
- Latence : +50-200ms par action
- I/O disque : élevé
- Risque de saturation du disque

**Solution** : ✅ Implémentée
- Rotation automatique des logs
- Limite de taille (10 MB par défaut)
- Nettoyage des anciens logs

#### 2. Pas de Cache (IMPORTANT)
**Problème actuel** :
- Templates lus depuis le disque à chaque requête
- Liste des projets recalculée à chaque fois
- Pas de cache en mémoire

**Impact** :
- Latence : +10-50ms par requête
- I/O disque : élevé

**Solution recommandée** : Cache en mémoire pour :
- Templates HTML
- Liste des projets (TTL: 30-60s)
- Tags disponibles

#### 3. Sessions en Mémoire (MOYEN)
**Problème actuel** :
- Sessions stockées en mémoire
- Perdues au redémarrage
- Pas de partage entre instances

**Impact** :
- Limite la scalabilité horizontale
- Perte de sessions au redémarrage

**Solution recommandée** : Redis pour les sessions (production)

#### 4. Pas de Rate Limiting (MOYEN)
**Problème actuel** :
- Pas de limitation du nombre de requêtes
- Risque de surcharge

**Impact** :
- Possible surcharge du serveur
- Risque de DoS

**Solution recommandée** : Middleware express-rate-limit

### Optimisations Implémentées

#### ✅ Gestion des Noms de Fichiers
- Sanitization avec gestion des accents
- Détection et résolution des doublons
- Noms de fichiers uniques garantis

#### ✅ Rotation des Logs
- Rotation automatique à 10 MB
- Conservation de 5 fichiers maximum
- Nettoyage des logs anciens (>30 jours)

### Optimisations Recommandées

#### 1. Cache en Mémoire (Priorité HAUTE)

```javascript
// server.js
const NodeCache = require('node-cache');
const templateCache = new NodeCache({ stdTTL: 3600 }); // 1 heure
const projectsCache = new NodeCache({ stdTTL: 60 }); // 1 minute

// Cache des templates
app.get('/api/templates/project_full', async (req, res) => {
    let template = templateCache.get('project_full');
    if (!template) {
        template = await fs.readFile(templatePath, 'utf8');
        templateCache.set('project_full', template);
    }
    res.send(template);
});
```

**Bénéfice** : Réduction de 80-90% des I/O disque pour les templates

#### 2. Rate Limiting (Priorité MOYENNE)

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requêtes par IP
});

app.use('/api/', limiter);
```

**Bénéfice** : Protection contre la surcharge

#### 3. Compression des Réponses (Priorité BASSE)

```javascript
const compression = require('compression');
app.use(compression());
```

**Bénéfice** : Réduction de 60-80% de la bande passante

#### 4. Sessions Redis (Production)

```javascript
const RedisStore = require('connect-redis')(session);
app.use(session({
    store: new RedisStore({ host: 'localhost', port: 6379 }),
    // ...
}));
```

**Bénéfice** : Scalabilité horizontale

### Configuration Recommandée pour 100 Utilisateurs

#### Serveur Minimum (Réseau Local)
- **CPU** : 2 cœurs
- **RAM** : 512 MB - 1 GB
- **Disque** : SSD recommandé (meilleur I/O)
- **Réseau** : 100 Mbps (réseau local de l'école)

#### Serveur Recommandé (Réseau Local)
- **CPU** : 4 cœurs
- **RAM** : 2 GB
- **Disque** : SSD
- **Réseau** : 1 Gbps (réseau local de l'école)

> **Note** : Ces configurations sont adaptées pour un déploiement sur le réseau local de l'école. Pour un déploiement Internet avec reverse proxy et SSL, des configurations supplémentaires seront nécessaires (projets étudiants futurs).

### Monitoring Recommandé

#### Métriques à Surveiller
1. **Temps de réponse** :
   - API : < 200ms (p95)
   - Pages statiques : < 100ms (p95)

2. **Utilisation des ressources** :
   - CPU : < 70%
   - RAM : < 80%
   - Disque I/O : < 80%

3. **Taille des logs** :
   - Vérifier quotidiennement
   - Alerte si > 50 MB

#### Outils Recommandés
- **PM2** : Monitoring des processus Node.js
- **New Relic / Datadog** : APM (Application Performance Monitoring)
- **Grafana + Prometheus** : Métriques personnalisées

### Tests de Charge

Pour valider les estimations, effectuer des tests de charge :

```bash
# Installer Apache Bench
sudo apt install apache2-utils

# Test de charge sur la page d'accueil
ab -n 1000 -c 100 http://localhost:3000/page_accueil.html

# Test de charge sur l'API
ab -n 500 -c 50 -p post_data.json -T application/json http://localhost:3000/api/projects/published
```

### Conclusion

Avec les optimisations implémentées (rotation des logs, gestion des noms de fichiers), la plateforme devrait **gérer confortablement 100 utilisateurs simultanés** sur un serveur avec :
- 2-4 cœurs CPU
- 1-2 GB RAM
- SSD

Les optimisations supplémentaires (cache, rate limiting) amélioreront encore les performances et la stabilité.

