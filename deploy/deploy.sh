#!/bin/bash
# Script de déploiement BluePrint avec Podman

set -e  # Arrêter en cas d'erreur

echo "🚀 Déploiement de BluePrint avec Podman..."

# Vérifier que Podman est installé
if ! command -v podman &> /dev/null; then
    echo "❌ Erreur: Podman n'est pas installé"
    exit 1
fi

# Vérifier que podman-compose est disponible
if ! command -v podman-compose &> /dev/null && ! command -v docker-compose &> /dev/null; then
    echo "⚠️  Avertissement: podman-compose n'est pas installé"
    echo "Installation optionnelle: sudo dnf install podman-compose"
    echo "Continuons avec podman run..."
    USE_COMPOSE=false
else
    USE_COMPOSE=true
fi

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Erreur: Fichier .env introuvable"
    echo "Copiez .env.example en .env et configurez les variables:"
    echo "  cp .env.example .env"
    echo "  nano .env"
    exit 1
fi

# Vérifier que SESSION_SECRET est configuré
if grep -q "changez-moi-en-production" .env || grep -q "CHANGEZ-MOI" .env; then
    echo "⚠️  ATTENTION: SESSION_SECRET n'a pas été modifié dans .env"
    echo "Générez un secret avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    read -p "Continuer quand même? (y/N): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        exit 1
    fi
fi

# Vérifier que l'image existe
if ! podman images | grep -q "blueprint-app"; then
    echo "📦 L'image n'existe pas, construction..."
    ./deploy/build.sh
fi

# Arrêter le conteneur existant s'il existe
if podman ps -a | grep -q "blueprint-app"; then
    echo "🛑 Arrêt du conteneur existant..."
    podman stop blueprint-app 2>/dev/null || true
    podman rm blueprint-app 2>/dev/null || true
fi

# Créer les répertoires nécessaires
echo "📁 Création des répertoires..."
mkdir -p blueprint_local/public/uploads
mkdir -p blueprint_local/intranet/projects/drafts
mkdir -p blueprint_local/public/projects/published
mkdir -p blueprint_local/intranet/projects/published_md
mkdir -p logs

# Déployer avec podman-compose si disponible
if [ "$USE_COMPOSE" = true ]; then
    echo "🚀 Démarrage avec podman-compose..."
    if command -v podman-compose &> /dev/null; then
        podman-compose -f podman-compose.yml up -d
    else
        docker-compose -f podman-compose.yml up -d
    fi
else
    echo "🚀 Démarrage avec podman run..."
    source .env
    podman run -d \
        --name blueprint-app \
        -p 8000:8000 \
        --env-file .env \
        -v "$(pwd)/blueprint_local:/app/blueprint_local:Z" \
        -v "$(pwd)/logs:/app/logs:Z" \
        -v "$(pwd)/rejection_reasons.json:/app/rejection_reasons.json:Z" \
        -v "$(pwd)/available_tags.json:/app/available_tags.json:Z" \
        -v "$(pwd)/featured_projects.json:/app/featured_projects.json:Z" \
        --restart unless-stopped \
        blueprint-app:latest
fi

# Attendre que le conteneur démarre
echo "⏳ Attente du démarrage du conteneur..."
sleep 3

# Vérifier le statut
if podman ps | grep -q "blueprint-app"; then
    echo "✅ Conteneur démarré avec succès!"
    echo ""
    echo "📊 Statut:"
    podman ps | grep blueprint-app
    echo ""
    echo "📋 Logs (dernières 20 lignes):"
    podman logs --tail 20 blueprint-app
    echo ""
    echo "🔍 Vérification du health check..."
    sleep 2
    if curl -s http://localhost:8000/api/health > /dev/null; then
        echo "✅ Health check réussi!"
    else
        echo "⚠️  Health check en attente (peut prendre quelques secondes)"
    fi
    echo ""
    echo "🌐 Application accessible sur: http://localhost:8000"
    echo "📖 Voir les logs: podman logs -f blueprint-app"
    echo "🛑 Arrêter: ./deploy/stop.sh"
else
    echo "❌ Erreur: Le conteneur n'a pas démarré"
    echo "Vérifiez les logs: podman logs blueprint-app"
    exit 1
fi

