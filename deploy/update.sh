#!/bin/bash
# Script pour mettre à jour l'application BluePrint

set -e

echo "🔄 Mise à jour de BluePrint..."

# Vérifier que le conteneur existe
if ! podman ps -a | grep -q "blueprint-app"; then
    echo "❌ Le conteneur n'existe pas"
    echo "Déployez d'abord avec: ./deploy/deploy.sh"
    exit 1
fi

# Sauvegarder les données
echo "💾 Sauvegarde des données..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
tar -czf "$BACKUP_DIR/blueprint_local.tar.gz" blueprint_local/ 2>/dev/null || true
tar -czf "$BACKUP_DIR/config.tar.gz" \
    rejection_reasons.json \
    available_tags.json \
    featured_projects.json \
    .env 2>/dev/null || true
echo "✅ Sauvegarde créée dans $BACKUP_DIR"

# Arrêter le conteneur
echo "🛑 Arrêt du conteneur..."
podman stop blueprint-app

# Reconstruire l'image
echo "🔨 Reconstruction de l'image..."
./deploy/build.sh

# Redémarrer
echo "🚀 Redémarrage..."
./deploy/deploy.sh

echo "✅ Mise à jour terminée!"

