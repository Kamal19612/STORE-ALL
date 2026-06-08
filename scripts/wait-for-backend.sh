#!/usr/bin/env bash
# Attend que l'API Spring écoute avant de lancer Vite (évite les ECONNREFUSED au proxy).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
STORE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$STORE_DIR/frontend/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$STORE_DIR/frontend/.env"
  set +a
fi

PORT="${BACKEND_PORT:-${SERVER_PORT:-8085}}"
HOST="${BACKEND_HOST:-127.0.0.1}"
MAX_WAIT="${BACKEND_WAIT_SECONDS:-180}"
INTERVAL=2

echo "[wait-for-backend] En attente de http://${HOST}:${PORT} (max ${MAX_WAIT}s, backend Maven en cours)…"

elapsed=0
while (( elapsed < MAX_WAIT )); do
  if (echo >/dev/tcp/"${HOST}"/"${PORT}") 2>/dev/null; then
    echo "[wait-for-backend] API prête (${elapsed}s)."
    exit 0
  fi
  sleep "$INTERVAL"
  elapsed=$((elapsed + INTERVAL))
done

echo "[wait-for-backend] Timeout après ${MAX_WAIT}s — lancement de Vite quand même." >&2
exit 0
