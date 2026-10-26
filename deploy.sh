#!/bin/bash
set -e

COMPOSE_FILE="docker-compose.prod.yml"
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }
WATCH_SECONDS=${WATCH_SECONDS:-40}

trap 'echo "!!! DEPLOYMENT FAILED at Step $CURRENT_STEP !!!" >&2
      compose ps -a >&2 || true
      compose logs --no-color --tail=40 >&2 || true
      exit 1' ERR

# Detects crash loops: checks all containers repeatedly for WATCH_SECONDS
watch_for_crashes() {
    local ids id name before after state health code
    ids=$(compose ps -aq)
    declare -A before
    for id in $ids; do
        before[$id]=$(docker inspect -f '{{.RestartCount}}' "$id")
    done

    for ((t = 5; t <= WATCH_SECONDS; t += 5)); do
        sleep 5
        for id in $ids; do
            name=$(docker inspect -f '{{.Name}}' "$id")
            state=$(docker inspect -f '{{.State.Status}}' "$id")
            health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$id")
            code=$(docker inspect -f '{{.State.ExitCode}}' "$id")
            after=$(docker inspect -f '{{.RestartCount}}' "$id")

            [ "$state" = "restarting" ] && { echo "$name is in a restart loop" >&2; return 1; }
            [ "$after" -gt "${before[$id]}" ] && { echo "$name restarted ($after times)" >&2; return 1; }
            [ "$state" = "exited" ] && [ "$code" != "0" ] && { echo "$name exited with code $code" >&2; return 1; }
            [ "$health" = "unhealthy" ] && { echo "$name is unhealthy" >&2; return 1; }
        done
        echo "  all containers stable (${t}s/${WATCH_SECONDS}s)"
    done
}

CURRENT_STEP="1: Pulling App Infrastructure"
echo "--- $CURRENT_STEP ---"
compose pull

CURRENT_STEP="2: Pulling Domain Identification Tools"
echo "--- $CURRENT_STEP ---"
TOOL_IMAGES_FILE=$(mktemp)
trap 'rm -f "$TOOL_IMAGES_FILE"' EXIT   # note: ERR trap above still runs first on failure
compose run --rm --no-deps -T api python -m app.tools.cli list-images >"$TOOL_IMAGES_FILE"
grep -q '[^[:space:]]' "$TOOL_IMAGES_FILE" || { echo "Empty tool image list." >&2; false; }
while IFS= read -r IMG; do
    [ -z "$IMG" ] && continue
    echo "Processing: $IMG"
    docker pull "$IMG"
done <"$TOOL_IMAGES_FILE"

CURRENT_STEP="3: Starting Services (waits for healthchecks)"
echo "--- $CURRENT_STEP ---"
compose up -d --wait --wait-timeout 120

CURRENT_STEP="4: Database Migrations"
echo "--- $CURRENT_STEP ---"
compose exec -T api alembic upgrade head

CURRENT_STEP="5: Watching for crashes / restart loops"
echo "--- $CURRENT_STEP ---"
watch_for_crashes

CURRENT_STEP="6: Cleanup"
echo "--- $CURRENT_STEP ---"
docker image prune -f

echo "  DEPLOYMENT SUCCESSFUL  "