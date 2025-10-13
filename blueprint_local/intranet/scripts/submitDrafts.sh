#!/bin/bash
# This script receives JSON data from a fetch() request and saves it as a draft
# project file in the `/intranet/projects/drafts/` directory.

# The absolute path to the drafts directory.
DRAFT_DIR="$(dirname "$0")/../projects/drafts"

# Read the JSON stream sent by the fetch() request from standard input.
read -r body

# Extract the title from the JSON to use as the filename.
# This replaces spaces with underscores to create a valid filename.
TITLE=$(echo "$body" | grep -oP '(?<="titre":")[^"]+')
FILENAME="${TITLE// /_}.json"

# Create the drafts directory if it doesn't already exist.
mkdir -p "$DRAFT_DIR"

# Write the received JSON data to the new draft file.
echo "$body" > "$DRAFT_DIR/$FILENAME"

# Output a success message.
echo "Content-Type: text/plain"
echo ""
echo "Brouillon enregistré sous $DRAFT_DIR/$FILENAME"
