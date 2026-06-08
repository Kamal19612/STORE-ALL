#!/usr/bin/env bash
# Démarre STORE-ALL (Supabase store_all + backend + frontend) en arrière-plan.
#
# Usage :
#   ./scripts/store-all-dev-bg.sh          # setup + démarrage
#   ./scripts/store-all-dev-bg.sh --no-setup   # sans store-all-local-setup.sh
#   ./scripts/store-all-dev-bg.sh down     # arrêt (npm + processus sur les ports)
#   ./scripts/store-all-dev-bg.sh status   # état + chemins des logs
#   ./scripts/store-all-dev-bg.sh logs     # tail des logs
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
RUN_DIR="$ROOT/.store-all-run"
LOG_DIR="$RUN_DIR/logs"
PID_FILE="$RUN_DIR/dev.pid"
DEV_LOG="$LOG_DIR/dev.log"

usage() {
  cat <<EOF
Usage: store-all-dev-bg.sh [up|--no-setup|down|status|logs]

  up (défaut)   Setup local + npm run dev en arrière-plan
  --no-setup    Démarre sans relancer store-all-local-setup.sh
  down          Arrête le processus npm run dev (groupe)
  status        Affiche PID et URLs
  logs          tail -f $DEV_LOG
EOF
}

ensure_dirs() {
  mkdir -p "$LOG_DIR"
}

is_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  if [[ -f "$PID_FILE" ]]; then
    tr -d ' \n\r\t' <"$PID_FILE" || true
  fi
}

read_dev_ports() {
  local env_file="$FRONTEND/.env"
  FRONTEND_PORT="${FRONTEND_DEV_PORT:-5176}"
  BACKEND_PORT="${BACKEND_PORT:-8085}"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC1090
    set -a
    # shellcheck source=/dev/null
    source <(grep -E '^(FRONTEND_DEV_PORT|BACKEND_PORT|SERVER_PORT)=' "$env_file" 2>/dev/null || true)
    set +a
    FRONTEND_PORT="${FRONTEND_DEV_PORT:-$FRONTEND_PORT}"
    BACKEND_PORT="${BACKEND_PORT:-${SERVER_PORT:-8085}}"
  fi
}

kill_listeners_on_port() {
  local port="$1"
  local label="$2"
  local pids=""

  if command -v lsof &>/dev/null; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u | tr '\n' ' ' || true)"
  elif command -v fuser &>/dev/null; then
    pids="$(fuser -n tcp "$port" 2>/dev/null | tr -s ' ' '\n' | sort -u | tr '\n' ' ' || true)"
  fi

  if [[ -z "${pids// }" ]]; then
    return 0
  fi

  echo "[store-all-bg] Libération port $port ($label) : pid(s) $pids"
  kill $pids 2>/dev/null || true
  local i pid
  for i in {1..20}; do
    local still=""
    for pid in $pids; do
      is_running "$pid" && still=1
    done
    [[ -z "$still" ]] && return 0
    sleep 0.25
  done
  kill -9 $pids 2>/dev/null || true
  # Processus orphelins (ex. mvn spring-boot:run lancé en root) : kill classique peut échouer.
  for pid in $pids; do
    if is_running "$pid"; then
      if command -v sudo &>/dev/null; then
        echo "[store-all-bg] Port $port encore occupé par pid=$pid — tentative sudo kill"
        sudo kill -9 "$pid" 2>/dev/null || true
      fi
    fi
  done
}

cmd_down() {
  local pid
  pid="$(read_pid)"
  if [[ -n "$pid" ]] && is_running "$pid"; then
    echo "[store-all-bg] Arrêt pid=$pid …"
    kill "$pid" 2>/dev/null || true
    local i
    for i in {1..40}; do
      if ! is_running "$pid"; then
        break
      fi
      sleep 0.25
    done
    if is_running "$pid"; then
      kill -9 "$pid" 2>/dev/null || true
      echo "[store-all-bg] npm forcé (SIGKILL)."
    fi
  else
    echo "[store-all-bg] Aucun processus npm dev actif (pid file)."
  fi
  rm -f "$PID_FILE"

  read_dev_ports
  kill_listeners_on_port "$FRONTEND_PORT" "Vite"
  kill_listeners_on_port "$BACKEND_PORT" "Spring Boot"
  echo "[store-all-bg] Arrêté."
}

cmd_status() {
  local pid
  pid="$(read_pid)"
  if [[ -n "$pid" ]] && is_running "$pid"; then
    echo "[store-all-bg] RUNNING pid=$pid"
    echo "  log : $DEV_LOG"
    echo "  front (défaut) : http://127.0.0.1:5176"
    echo "  API (proxy /api) : http://127.0.0.1:8085"
    echo "  Supabase Studio : http://127.0.0.1:54523"
  else
    echo "[store-all-bg] STOPPED"
    [[ -f "$PID_FILE" ]] && rm -f "$PID_FILE"
  fi
}

cmd_logs() {
  ensure_dirs
  touch "$DEV_LOG"
  tail -n 200 -f "$DEV_LOG"
}

cmd_up() {
  local no_setup=false
  if [[ "${1:-}" == "--no-setup" ]]; then
    no_setup=true
  fi

  ensure_dirs

  local existing
  existing="$(read_pid)"
  if [[ -n "$existing" ]] && is_running "$existing"; then
    echo "[store-all-bg] Déjà en cours (pid=$existing). Utilisez : $0 down"
    cmd_status
    exit 0
  fi

  if ! "$no_setup"; then
    echo "[store-all-bg] Configuration locale (Supabase store_all + .env)…"
    bash "$ROOT/scripts/store-all-local-setup.sh"
  else
    bash "$ROOT/scripts/ensure-store-all-database.sh"
  fi

  if [[ ! -f "$FRONTEND/package.json" ]]; then
    echo "[store-all-bg] package.json introuvable : $FRONTEND" >&2
    exit 1
  fi

  if [[ ! -d "$FRONTEND/node_modules" ]]; then
    echo "[store-all-bg] npm install dans frontend/ …"
    (cd "$FRONTEND" && npm install >>"$DEV_LOG" 2>&1)
  fi

  read_dev_ports
  kill_listeners_on_port "$FRONTEND_PORT" "Vite"
  kill_listeners_on_port "$BACKEND_PORT" "Spring Boot"

  : >"$DEV_LOG"
  echo "[store-all-bg] Démarrage npm run dev en arrière-plan…"

  (
    cd "$FRONTEND"
    unset DB_JDBC_URL DB_PORT DB_HOST DB_PASSWORD SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY 2>/dev/null || true
    nohup npm run dev >>"$DEV_LOG" 2>&1 &
    echo $! >"$PID_FILE"
  )

  sleep 2
  cmd_status
  echo "[store-all-bg] Suivre les logs : $0 logs"
}

CMD="${1:-up}"
case "$CMD" in
  up) cmd_up "${2:-}" ;;
  --no-setup) cmd_up --no-setup ;;
  down) cmd_down ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  -h|--help|help) usage ;;
  *)
    echo "Commande inconnue: $CMD" >&2
    usage >&2
    exit 1
    ;;
esac
