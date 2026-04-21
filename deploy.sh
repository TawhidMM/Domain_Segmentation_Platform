#!/bin/bash

# Terminate immediately if any command fails
set -e

# Optional: Print a message if the script exits on an error
trap 'echo "!!! DEPLOYMENT FAILED at Step $CURRENT_STEP !!!"; exit 1' ERR

CURRENT_STEP="1: Pulling Research Tools"
echo "--- $CURRENT_STEP ---"
TOOL_IMAGES=$(python3 get_tool_images.py)
for IMG in $TOOL_IMAGES; do
    echo "Processing: $IMG"
    docker pull "$IMG"
    echo "Done with $IMG"
    echo "------------------------------------------"
done

CURRENT_STEP="2: Pulling App Infrastructure"
echo "--- $CURRENT_STEP ---"
docker compose -f docker-compose.prod.yml pull

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