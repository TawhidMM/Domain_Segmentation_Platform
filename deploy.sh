#!/bin/bash

# Terminate immediately if any command fails
set -e

# Optional: Print a message if the script exits on an error
trap 'echo "!!! DEPLOYMENT FAILED at Step $CURRENT_STEP !!!"; exit 1' ERR

CURRENT_STEP="1: Pulling App Infrastructure"
echo "--- $CURRENT_STEP ---"
docker compose -f docker-compose.prod.yml pull

CURRENT_STEP="2: Listing and Pulling Domain Identification Tools"
echo "--- $CURRENT_STEP ---"
TOOL_IMAGES_FILE=$(mktemp)
if ! docker compose -f docker-compose.prod.yml run --rm --no-deps -T api \
    python -m app.tools.cli list-images >"$TOOL_IMAGES_FILE"; then
    echo "Failed to list tool images from the deployed API image." >&2
    exit 1
fi
if ! grep -q '[^[:space:]]' "$TOOL_IMAGES_FILE"; then
    echo "The deployed API image returned an empty tool image list." >&2
    exit 1
fi
while IFS= read -r IMG; do
    [ -z "$IMG" ] && continue
    echo "Processing: $IMG"
    docker pull "$IMG"
    echo "Done with $IMG"
    echo "------------------------------------------"
done <"$TOOL_IMAGES_FILE"
rm -f "$TOOL_IMAGES_FILE"

CURRENT_STEP="3: Restarting Services"
echo "--- $CURRENT_STEP ---"
docker compose -f docker-compose.prod.yml up -d

CURRENT_STEP="4: Database Migrations"
echo "--- $CURRENT_STEP ---"
echo "Waiting 5s for Postgres to initialize..."
sleep 5
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

CURRENT_STEP="5: Cleanup"
echo "--- $CURRENT_STEP ---"
docker image prune -f

echo "**************************"
echo "  DEPLOYMENT SUCCESSFUL   "
echo "**************************"