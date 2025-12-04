#!/bin/bash
# Script de construction de l'image Podman pour BluePrint

set -e  # Arrêter en cas d'erreur

echo "🔨 Construction de l'image BluePrint avec Podman..."

# Vérifier que Podman est installé
if ! command -v podman &> /dev/null; then
    echo "❌ Erreur: Podman n'est pas installé"
    echo "Installez Podman avec: sudo dnf install podman (RHEL/Fedora) ou sudo apt-get install podman (Ubuntu/Debian)"
    exit 1
fi

# Vérifier que le Containerfile existe
if [ ! -f "Containerfile" ]; then
    echo "❌ Erreur: Containerfile introuvable"
    echo "Assurez-vous d'exécuter ce script depuis la racine du projet"
    exit 1
fi

# Demander la version/tag (optionnel)
read -p "Tag de l'image (ex: latest, v1.0.0) [latest]: " IMAGE_TAG
IMAGE_TAG=${IMAGE_TAG:-latest}

# Construire l'image
echo "📦 Construction de l'image blueprint-app:${IMAGE_TAG}..."
podman build -t blueprint-app:${IMAGE_TAG} -f Containerfile .

if [ $? -eq 0 ]; then
    echo "✅ Image construite avec succès: blueprint-app:${IMAGE_TAG}"
    echo ""
    echo "Pour démarrer le conteneur, utilisez:"
    echo "  ./deploy/deploy.sh"
    echo ""
    echo "Ou manuellement:"
    echo "  podman-compose -f podman-compose.yml up -d"
else
    echo "❌ Erreur lors de la construction de l'image"
    exit 1
fi

