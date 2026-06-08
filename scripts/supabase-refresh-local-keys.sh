#!/usr/bin/env bash
# Lit API_URL et SERVICE_ROLE_KEY via `supabase status` et les écrit dans supabase/.env
# (en conservant POSTGRES_PASSWORD et le reste). À lancer depuis la racine STORE-ALL (ou tout dossier avec supabase/.env).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="$ROOT/supabase"
ENV_FILE="$WORKDIR/.env"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

if ! command -v supabase &>/dev/null; then
  echo "[store-all] CLI supabase absente — https://supabase.com/docs/guides/cli" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "[store-all] Créez d'abord $ENV_FILE (ex. cp supabase/.env.example supabase/.env)" >&2
  exit 1
fi

if ! (cd "$WORKDIR" && supabase status -o env >"$TMP" 2>/dev/null); then
  echo "[store-all] Statut Supabase indisponible. Lancez : cd \"$WORKDIR\" && supabase start" >&2
  exit 1
fi

get_kv() {
  local k="$1"
  local v
  v="$(grep -m1 "^${k}=" "$TMP" | sed "s/^${k}=//" | tr -d '\r' || true)"
  v="${v#\"}"
  v="${v%\"}"
  v="${v#\'}"
  v="${v%\'}"
  echo "$v"
}

SRK="$(get_kv SERVICE_ROLE_KEY)"
[[ -z "$SRK" ]] && SRK="$(get_kv SUPABASE_SERVICE_ROLE_KEY)"
API_URL="$(get_kv API_URL)"
DB_URL="$(get_kv DB_URL)"
[[ -z "$SRK" ]] && {
  echo "[store-all] Pas de SERVICE_ROLE_KEY dans \"supabase status -o env\"." >&2
  exit 1
}

ARGS=(python3 "$ROOT/scripts/_merge_dotenv.py" "$ENV_FILE" "SERVICE_ROLE_KEY" "$SRK")

if [[ -n "$API_URL" ]]; then
  PORT="$(API_URL="$API_URL" python3 -c 'import os; from urllib.parse import urlparse as P; u=P(os.environ["API_URL"]); print(u.port or (443 if u.scheme=="https" else 80))')"
  ARGS+=("SUPABASE_PUBLIC_URL" "$API_URL" "KONG_HTTP_PORT" "$PORT")
fi

if [[ -n "$DB_URL" ]]; then
  read -r JDBC DB_HOST DB_PORT DB_NAME <<EOF
$(DB_URL="$DB_URL" python3 - <<'PY'
import os
from urllib.parse import urlparse as P
u = P(os.environ["DB_URL"])
host = u.hostname or "127.0.0.1"
port = u.port or 5432
name = (u.path or "/postgres").lstrip("/") or "postgres"
# JDBC Postgres : host/port/db uniquement — user/pass via spring.datasource.username/password
jdbc = f"jdbc:postgresql://{host}:{port}/{name}"
print(jdbc, host, port, name)
PY
)
EOF
  ARGS+=("DB_JDBC_URL" "$JDBC" "DB_HOST" "$DB_HOST" "DB_PORT" "$DB_PORT" "DB_NAME" "$DB_NAME")
fi

"${ARGS[@]}"
echo "[store-all] Mis à jour $ENV_FILE (SERVICE_ROLE_KEY, ports publics si disponibles)." >&2
