#!/bin/bash
FILE_NAME=$1
SRC="./intranet/projects/drafts/$FILE_NAME"
DEST="./public/projects/published/$FILE_NAME"

if [ -f "$SRC" ]; then
  mv "$SRC" "$DEST"
  echo "✅ Projet $FILE_NAME publié."
else
  echo "❌ Fichier introuvable."
fi
