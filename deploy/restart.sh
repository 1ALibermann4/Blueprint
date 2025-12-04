#!/bin/bash
# Script pour redémarrer le conteneur BluePrint

set -e

echo "🔄 Redémarrage du conteneur BluePrint..."

if podman ps -a | grep -q "blueprint-app"; then
    podman restart blueprint-app
    echo "✅ Conteneur redémarré"
    echo ""
    echo "📋 Logs (dernières 10 lignes):"
    sleep 2
    podman logs --tail 10 blueprint-app
else
    echo "❌ Le conteneur n'existe pas"
    echo "Déployez d'abord avec: ./deploy/deploy.sh"
    exit 1
fi

