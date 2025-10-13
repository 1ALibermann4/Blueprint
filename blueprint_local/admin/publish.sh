#!/bin/bash
# This script moves a project file from the 'drafts' directory to the 'published'
# directory. It is called by the validation page when a project is approved.

# The name of the file to publish, passed as the first argument.
FILE_NAME=$1

# Source and destination paths.
SRC="../projects/drafts/$FILE_NAME"
DEST="../projects/published/$FILE_NAME"

# Check if the source file exists before moving it.
if [ -f "$SRC" ]; then
  # Move the file to the published directory.
  mv "$SRC" "$DEST"
  echo "Projet $FILE_NAME publié."
else
  # If the file is not found, output an error message.
  echo "Fichier introuvable."
  exit 1
fi
