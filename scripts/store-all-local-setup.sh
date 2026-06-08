#!/usr/bin/env bash
# Installation locale STORE-ALL : fichiers .env d'exemple + (optionnel) Supabase Docker + injection des clés.
#
# Usage :
#   ./scripts/store-all-local-setup.sh                  # tout (templates, supabase start, refresh clés)
#   ./scripts/store-all-local-setup.sh --env-only      # uniquement copier les .env.example → .env
#   ./scripts/store-all-local-setup.sh --no-start      # sans "supabase start" (refresh si stack déjà up)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chmod +x "$ROOT/scripts"/*.sh "$ROOT/scripts"/*.py 2>/dev/null || true
ENV_ONLY=false
NO_START=false
while (($#)); do
  case "${1:-}" in
    --env-only) ENV_ONLY=true ;;
    --no-start) NO_START=true ;;
    -h|--help)
      cat <<'EOF'
Usage: store-all-local-setup.sh [--env-only] [--no-start]

  --env-only   Copie uniquement supabase/.env et frontend/.env depuis les .env.example
  --no-start   Ne lance pas "supabase start" (réessaie quand même le refresh des clés si la stack répond)

Par défaut : templates manquants + supabase start (si nécessaire) + injection SERVICE_ROLE_KEY / API locale.
EOF
      exit 0
      ;;
    *)
      echo "Option inconnue: $1  (essayez --env-only ou --no-start)" >&2
      exit 1
      ;;
  esac
  shift
done

mkdir -p "$ROOT/supabase" "$ROOT/logs"
chmod +x "$ROOT/scripts/ensure-store-all-database.sh" 2>/dev/null || true

if [[ ! -f "$ROOT/supabase/.env" ]]; then
  cp "$ROOT/supabase/.env.example" "$ROOT/supabase/.env"
  echo "[store-all] Créé $ROOT/supabase/.env depuis .env.example"
fi

if [[ ! -f "$ROOT/frontend/.env" ]]; then
  if [[ -f "$ROOT/frontend/.env.example" ]]; then
    cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env"
    echo "[store-all] Créé $ROOT/frontend/.env depuis .env.example"
  else
    echo "[store-all] AVERTISSEMENT : frontend/.env.example absent — créez frontend/.env à la main." >&2
  fi
fi

if "$ENV_ONLY"; then
  echo "[store-all] Fin (--env-only). Ensuite : cd \"$ROOT/supabase\" && supabase start"
  echo "               puis bash \"$ROOT/scripts/supabase-refresh-local-keys.sh\""
  exit 0
fi

command -v supabase &>/dev/null || {
  echo "[store-all] Installe la CLI Supabase pour continuer (ou utilise --env-only)." >&2
  exit 1
}

WORKDIR="$ROOT/supabase"

if "$NO_START"; then
  echo "[store-all] --no-start : pas de \"supabase start\"."
elif ! (cd "$WORKDIR" && supabase status &>/dev/null); then
  command -v docker &>/dev/null || {
    echo "[store-all] Docker est requis pour la première fois (supabase start)." >&2
    exit 1
  }
  echo "[store-all] Premier démarrage Supabase (Docker) pour ce projet …"
  (cd "$WORKDIR" && supabase start)
else
  echo "[store-all] Supabase répond déjà pour ce dossier."
fi

bash "$ROOT/scripts/supabase-refresh-local-keys.sh" || {
  echo "[store-all] refresh des clés échoué (stack arrêtée ?). Relance après supabase start." >&2
  exit 1
}

bash "$ROOT/scripts/ensure-store-all-database.sh"

echo ""
echo "[store-all] Prêt."
echo "  • API Spring (défaut) : 8085 — surcharge : SERVER_PORT (voir application.yml) — Postgres local : 5634 (DB_PORT / supabase/config.toml)"
echo "  • Front               : cd \"$ROOT/frontend\" && npm install && npm run dev — ports : FRONTEND_DEV_PORT / FRONTEND_PREVIEW_PORT / BACKEND_PORT dans frontend/.env (voir .env.example)"
echo "  • Supabase            : stack dédiée ce dépôt (project_id store_all) — ./scripts/store-all-local-setup.sh ou supabase start depuis supabase/"
echo "  • La boutique \"spirit\" et \"sucre\" sont créées au démarrage du backend (StoreBootstrap)."
echo "  • Rôles users (SUPER_ADMIN | MANAGER) : au boot LegacyUserRoleMigrator + contrainte CHECK ; hors ligne : scripts/normalize-user-roles.sql"
echo ""
