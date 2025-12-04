#!/bin/bash
# Script pour arrêter le conteneur BluePrint

set -e

echo "🛑 Arrêt du conteneur BluePrint..."

if podman ps | grep -q "blueprint-app"; then
    podman stop blueprint-app
    echo "✅ Conteneur arrêté"
else
    echo "ℹ️  Le conteneur n'est pas en cours d'exécution"
fi

if podman ps -a | grep -q "blueprint-app"; then
    read -p "Supprimer le conteneur? (y/N): " REMOVE
    if [ "$REMOVE" = "y" ] || [ "$REMOVE" = "Y" ]; then
        podman rm blueprint-app
        echo "✅ Conteneur supprimé"
    fi
fi

