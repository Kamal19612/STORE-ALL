#!/usr/bin/env bash
# Simulation rapide : pages, API, webhooks Telegram, WebSocket Vite HMR.
# Usage : bash scripts/simulate-healthcheck.sh [BASE_URL]
set -euo pipefail

BASE_URL="${1:-https://store.socialracine.com}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:8085}"
VITE_URL="${VITE_URL:-http://127.0.0.1:5176}"

pass=0
fail=0
warn=0

ok()   { echo "  OK   $1"; pass=$((pass + 1)); }
bad()  { echo "  FAIL $1"; fail=$((fail + 1)); }
note() { echo "  WARN $1"; warn=$((warn + 1)); }

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" --max-time 12 "$1" 2>/dev/null || echo "000"
}

echo "=== STORE-ALL health simulation ==="
echo "Public base : $BASE_URL"
echo "Backend     : $BACKEND_URL"
echo "Vite dev    : $VITE_URL"
echo

echo "[1] Pages HTTP"
for path in "/" "/manager/spirit/products/new" "/@vite/client"; do
  code=$(http_code "${BASE_URL}${path}")
  if [[ "$code" == "200" ]]; then ok "${path} → ${code}"; else bad "${path} → ${code}"; fi
done

echo
echo "[2] API (via proxy public)"
code=$(http_code "${BASE_URL}/api/categories")
if [[ "$code" == "200" ]]; then ok "/api/categories → ${code}"; else note "/api/categories → ${code} (peut nécessiter X-Store-Code)"; fi

code=$(http_code "${BASE_URL}/api/spirit/products/categories")
if [[ "$code" == "200" || "$code" == "401" ]]; then ok "/api/spirit/... → ${code}"; else bad "/api/spirit/... → ${code}"; fi

echo
echo "[3] Webhooks Telegram (POST vide = endpoint joignable)"
for url in "${BASE_URL}/api/telegram/webhook" "${BACKEND_URL}/api/telegram/webhook"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 12 -X POST "$url" \
    -H "Content-Type: application/json" -d '{"update_id":1}' 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then ok "POST $url → ${code}"; else bad "POST $url → ${code}"; fi
done

echo
echo "[4] WebSocket Vite HMR (protocole vite-hmr requis)"
ws_probe() {
  local host="$1"
  local port="$2"
  local path="$3"
  local use_tls="$4"
  local label="$5"
  local status
  status=$(python3 -c "
import base64, os, socket, ssl, sys
host, port, path, use_tls = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4] == '1'
key = base64.b64encode(os.urandom(16)).decode()
req = (
    f'GET {path} HTTP/1.1\r\n'
    f'Host: {host}\r\n'
    'Connection: Upgrade\r\n'
    'Upgrade: websocket\r\n'
    'Sec-WebSocket-Version: 13\r\n'
    'Sec-WebSocket-Protocol: vite-hmr\r\n'
    f'Sec-WebSocket-Key: {key}\r\n\r\n'
)
s = socket.create_connection((host, port), timeout=5)
if use_tls:
    s = ssl.create_default_context().wrap_socket(s, server_hostname=host)
s.send(req.encode())
s.settimeout(5)
line = s.recv(128).decode('latin1', 'replace').split('\r\n')[0]
s.close()
print(line)
" "$host" "$port" "$path" "$use_tls" 2>/dev/null || echo "ERR")
  if echo "$status" | grep -q "101"; then
    ok "${label} WebSocket → 101 Switching Protocols"
  else
    bad "${label} WebSocket → ${status:-timeout}"
  fi
}
ws_probe "127.0.0.1" "5176" "/?token=healthcheck" "0" "Vite local"
ws_probe "store.socialracine.com" "443" "/?token=healthcheck" "1" "Vite public (Apache)"

echo
echo "[5] Tests unitaires"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if (cd "$ROOT" && mvn -q test -Dtest=ProductServiceTest -DfailIfNoTests=false >/tmp/storeall-mvn-test.log 2>&1); then
  ok "ProductServiceTest (Maven)"
else
  bad "ProductServiceTest — voir /tmp/storeall-mvn-test.log"
fi
if (cd "$ROOT/frontend" && npm run test --silent >/tmp/storeall-vitest.log 2>&1); then
  ok "Vitest frontend"
else
  note "Vitest — voir /tmp/storeall-vitest.log"
fi

echo
echo "=== Résultat : ${pass} OK, ${fail} FAIL, ${warn} WARN ==="
[[ "$fail" -eq 0 ]]
