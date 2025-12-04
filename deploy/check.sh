#!/bin/bash
# Script de vérification pré-déploiement

echo "🔍 Vérification de l'environnement de déploiement..."
echo ""

ERRORS=0
WARNINGS=0

# Vérifier Podman
if command -v podman &> /dev/null; then
    PODMAN_VERSION=$(podman --version)
    echo "✅ Podman installé: $PODMAN_VERSION"
else
    echo "❌ Podman n'est pas installé"
    echo "   Installez avec: sudo dnf install podman (RHEL/Fedora) ou sudo apt-get install podman (Ubuntu/Debian)"
    ERRORS=$((ERRORS + 1))
fi

# Vérifier podman-compose (optionnel)
if command -v podman-compose &> /dev/null || command -v docker-compose &> /dev/null; then
    echo "✅ podman-compose disponible"
else
    echo "⚠️  podman-compose n'est pas installé (optionnel)"
    echo "   Installation: sudo dnf install podman-compose"
    WARNINGS=$((WARNINGS + 1))
fi

# Vérifier Node.js (pour générer le secret)
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installé: $NODE_VERSION"
else
    echo "⚠️  Node.js n'est pas installé (nécessaire pour générer SESSION_SECRET)"
    WARNINGS=$((WARNINGS + 1))
fi

# Vérifier les fichiers essentiels
echo ""
echo "📁 Vérification des fichiers..."

FILES=("Containerfile" "podman-compose.yml" ".env.example" "package.json" "server.js")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file manquant"
        ERRORS=$((ERRORS + 1))
    fi
done

# Vérifier .env
echo ""
if [ -f ".env" ]; then
    echo "✅ Fichier .env existe"
    
    # Vérifier SESSION_SECRET
    if grep -q "changez-moi-en-production" .env || grep -q "CHANGEZ-MOI" .env; then
        echo "⚠️  SESSION_SECRET n'a pas été modifié dans .env"
        echo "   Générez un secret avec: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ SESSION_SECRET configuré"
    fi
    
    # Vérifier les variables essentielles
    if grep -q "PORT=" .env && grep -q "NODE_ENV=" .env && grep -q "BASE_URL=" .env; then
        echo "✅ Variables d'environnement essentielles présentes"
    else
        echo "⚠️  Certaines variables d'environnement manquent"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "⚠️  Fichier .env n'existe pas"
    echo "   Créez-le avec: cp .env.example .env"
    WARNINGS=$((WARNINGS + 1))
fi

# Vérifier les répertoires
echo ""
echo "📂 Vérification des répertoires..."

DIRS=("blueprint_local/public/uploads" "blueprint_local/intranet/projects/drafts" "blueprint_local/public/projects/published" "logs")
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir"
    else
        echo "⚠️  $dir n'existe pas (sera créé automatiquement)"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# Vérifier les permissions des scripts
echo ""
echo "🔧 Vérification des scripts de déploiement..."

SCRIPTS=("deploy/build.sh" "deploy/deploy.sh" "deploy/stop.sh" "deploy/restart.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo "✅ $script (exécutable)"
        else
            echo "⚠️  $script n'est pas exécutable"
            echo "   Rendez-le exécutable avec: chmod +x $script"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "❌ $script manquant"
        ERRORS=$((ERRORS + 1))
    fi
done

# Résumé
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Toutes les vérifications sont passées!"
    echo "   Vous pouvez déployer avec: ./deploy/deploy.sh"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Vérifications terminées avec $WARNINGS avertissement(s)"
    echo "   Vous pouvez déployer, mais vérifiez les avertissements ci-dessus"
    exit 0
else
    echo "❌ $ERRORS erreur(s) et $WARNINGS avertissement(s) détecté(s)"
    echo "   Corrigez les erreurs avant de déployer"
    exit 1
fi

