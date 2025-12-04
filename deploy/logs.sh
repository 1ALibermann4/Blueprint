#!/bin/bash
# Script pour voir les logs du conteneur BluePrint

if podman ps -a | grep -q "blueprint-app"; then
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        echo "📋 Logs en temps réel (Ctrl+C pour quitter)..."
        podman logs -f blueprint-app
    else
        echo "📋 Dernières 50 lignes des logs:"
        podman logs --tail 50 blueprint-app
        echo ""
        echo "Pour suivre les logs en temps réel: ./deploy/logs.sh -f"
    fi
else
    echo "❌ Le conteneur n'existe pas"
    exit 1
fi

