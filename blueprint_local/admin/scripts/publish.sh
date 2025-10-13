#!/bin/bash
# Script CGI pour publier un projet (déplacer le JSON)
# Usage : /admin/scripts/publish.sh?file=nom.json

echo "Content-Type: text/plain"
echo ""

QUERY="$QUERY_STRING"
FILE=$(echo "$QUERY" | sed 's/^file=//')

DRAFT_DIR="$(dirname "$0")/../../intranet/projects/drafts"
PUB_DIR="$(dirname "$0")/../../public/projects/published"

SRC="$DRAFT_DIR/$FILE"
DEST="$PUB_DIR/$FILE"

if [ -f "$SRC" ]; then
  mkdir -p "$PUB_DIR"
  mv "$SRC" "$DEST"
  echo "Projet $FILE publié avec succès 🎉"
else
  echo "Erreur : fichier $FILE introuvable."
fi
