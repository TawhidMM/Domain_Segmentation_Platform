#!/bin/bash

echo "--- 1. Pulling Research Tools Sequentially ---"

# This runs the python script and captures the output into a variable
TOOL_IMAGES=$(python3 get_tool_images.py)

for IMG in $TOOL_IMAGES; do
    echo "Processing: $IMG"

    docker pull "$IMG"

    echo "Done with $IMG"
    echo "------------------------------------------"
done

echo "--- 2. Pulling App Infrastructure (FE/BE) ---"
docker compose -f docker-compose.prod.yml pull

echo "--- 3. Restarting Services ---"
docker compose -f docker-compose.prod.yml up -d

echo "--- 4. Cleanup ---"
docker image prune -f

echo "Deployment Successful."