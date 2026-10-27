#!/bin/bash
# auto-deploy.sh — run nightly from cron.
#   1) exits early if Celery workers are busy (BEFORE pulling anything)
#   2) pulls app images + tool images
#   3) re-checks workers, then runs deploy.sh only if something changed
#      since the last SUCCESSFUL deploy (state file written only on success,
#      so a skipped/failed night is retried automatically next run)
#
# Manual run:            ./auto-deploy.sh
# Ignore busy workers:   FORCE=1 ./auto-deploy.sh
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)"
cd "$PROJECT_DIR"
export PATH="/usr/local/bin:/usr/bin:/bin:${PATH:-}"

# ---------------- settings ----------------
COMPOSE_FILE="docker-compose.prod.yml"
APP_IMAGE_PREFIX="tawhidmm/"          # only these images can trigger a deploy
APP_SERVICES="api worker frontend"    # services whose images are pulled/checked
CELERY_APP="app.core.celery.celery_app"
LOG_FILE="${LOG_FILE:-$HOME/st_deploy.log}"
STATE_FILE="$PROJECT_DIR/.last_deployed_state"
FORCE="${FORCE:-0}"

# optional: put  WEBHOOK_URL="https://..."  in .deploy.env (Slack-style JSON webhook)
if [ -f "$PROJECT_DIR/.deploy.env" ]; then . "$PROJECT_DIR/.deploy.env"; fi

# ---------------- logging ----------------
if [ -f "$LOG_FILE" ] && [ "$(stat -c %s "$LOG_FILE")" -gt 5242880 ]; then
  tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv -f "$LOG_FILE.tmp" "$LOG_FILE"
fi
exec > >(tee -a "$LOG_FILE") 2>&1

log() { echo "[$(date '+%F %T %Z')] $*"; }

notify() {
  if [ -n "${WEBHOOK_URL:-}" ]; then
    curl -fsS -m 10 -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"[st_project @ $(hostname)] $1\"}" "$WEBHOOK_URL" >/dev/null || true
  fi
}

trap 'rc=$?; log "FAILED (exit $rc) at line $LINENO: $BASH_COMMAND"; notify "auto-deploy FAILED - see $LOG_FILE"; exit $rc' ERR

# ---------------- lock (no overlapping runs) ----------------
exec 9>"$PROJECT_DIR/.deploy.lock"
if ! flock -n 9; then
  log "another deploy is already running; exiting"
  exit 0
fi

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# ---------------- helpers ----------------

# Returns 0 (true) if any Celery task is running or queued on any worker.
# If workers can't be queried (e.g. not running), they are treated as idle.
workers_busy() {
  local kind out
  for kind in active reserved; do
    if out=$(compose exec -T worker celery -A "$CELERY_APP" inspect "$kind" --json --timeout 10 2>/dev/null); then
      if grep -q '"id"' <<<"$out"; then
        log "workers have $kind tasks"
        return 0
      fi
    else
      log "could not query workers ($kind); assuming idle"
    fi
  done
  return 1
}

get_tool_images() {
  compose run --rm --no-deps -T api python -m app.tools.cli list-images \
    | grep -v '^[[:space:]]*$' || true
}

# One line per image: "<ref> <local image id>"
snapshot() {
  { compose config --images | grep "^${APP_IMAGE_PREFIX}" || true
    printf '%s\n' "$TOOL_IMAGES"; } \
  | grep -v '^[[:space:]]*$' | sort -u \
  | while read -r img; do
      echo "$img $(docker image inspect -f '{{.Id}}' "$img" 2>/dev/null || echo missing)"
    done
}

# ---------------- main ----------------
log "=== auto-deploy check started ==="

# 1) Workers first: if experiments are running, don't pull or touch anything.
if [ "$FORCE" != "1" ] && workers_busy; then
  log "workers busy; skipping this run (nothing pulled)"
  exit 0
fi

# 2) Pull app images and tool images
log "pulling app images: $APP_SERVICES"
compose pull $APP_SERVICES

TOOL_IMAGES="$(get_tool_images)"
if [ -z "$TOOL_IMAGES" ]; then
  log "tool image list is empty"
  false
fi
while IFS= read -r img; do
  log "pulling tool image: $img"
  docker pull -q "$img" >/dev/null
done <<<"$TOOL_IMAGES"

# 3) Anything new since the last successful deploy?
NEW_STATE="$(snapshot)"
OLD_STATE="$(cat "$STATE_FILE" 2>/dev/null || true)"
if [ "$NEW_STATE" = "$OLD_STATE" ]; then
  log "no new images; nothing to do"
  exit 0
fi
log "new images detected:"
diff <(printf '%s\n' "$OLD_STATE") <(printf '%s\n' "$NEW_STATE") || true

# 4) Pulling can take minutes: check workers again right before restarting
if [ "$FORCE" != "1" ] && workers_busy; then
  log "workers became busy during pull; deferring deploy (will retry next run)"
  exit 0
fi

# 5) Deploy (pull, start, nginx refresh, migrations, crash watch)
notify "new images detected - deploying"
log "running deploy.sh"
bash ./deploy.sh

# 6) Record what is now deployed (only reached if deploy.sh succeeded)
printf '%s\n' "$NEW_STATE" > "$STATE_FILE"
notify "deploy OK"
log "=== deploy finished successfully ==="