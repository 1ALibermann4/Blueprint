#!/bin/bash
# Ce script reçoit le JSON envoyé par fetch() et le sauvegarde dans /intranet/projects/drafts/

# Chemin absolu vers le dossier de brouillons
DRAFT_DIR="$(dirname "$0")/../projects/drafts"

# Lecture du flux JSON envoyé par fetch
read -r body

# Extraction du titre depuis le JSON (simple mais efficace)
TITLE=$(echo "$body" | grep -oP '(?<="titre":")[^"]+')
FILENAME="${TITLE// /_}.json"

# Création du dossier s’il n’existe pas
mkdir -p "$DRAFT_DIR"

# Écriture du contenu
echo "$body" > "$DRAFT_DIR/$FILENAME"

# En-tête HTTP
echo "Content-Type: text/plain"
echo ""
echo "Brouillon enregistré sous $DRAFT_DIR/$FILENAME"
