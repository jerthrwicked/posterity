#!/usr/bin/env bash
# Fetch the Posterity app's Supabase keys via the Management API and write them
# into .env.local. Values are NEVER printed — only the key names and lengths.
set -euo pipefail

ENV_FILE="${HOME}/posterity/.env.local"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a
: "${SUPABASE_ACCESS_TOKEN:?not set}"
REF="${SUPABASE_PROJECT_REF:-vypytfmutmeyfwmkapjg}"

RESP="$(curl -sS --max-time 60 \
  "https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}")"

ANON="$(RESP="$RESP" python3 -c '
import json,os
try: d=json.loads(os.environ["RESP"])
except Exception: print(""); raise SystemExit
if not isinstance(d,list): print(""); raise SystemExit
print(next((k.get("api_key","") for k in d if k.get("name")=="anon"), ""))')"

SERVICE="$(RESP="$RESP" python3 -c '
import json,os
try: d=json.loads(os.environ["RESP"])
except Exception: print(""); raise SystemExit
if not isinstance(d,list): print(""); raise SystemExit
print(next((k.get("api_key","") for k in d if k.get("name")=="service_role"), ""))')"

if [ -z "$ANON" ] || [ -z "$SERVICE" ]; then
  echo "Could not read keys. Raw response (first 300 chars, may contain an error message):"
  echo "${RESP:0:300}"
  exit 1
fi

append_if_missing() {
  local name="$1" value="$2"
  if grep -q "^${name}=" "$ENV_FILE"; then
    echo "  ${name} — already present, left alone"
  else
    printf '%s=%s\n' "$name" "$value" >> "$ENV_FILE"
    echo "  ${name} — written (${#value} chars)"
  fi
}

echo "Writing to .env.local (values not shown):"
append_if_missing "NEXT_PUBLIC_SUPABASE_URL"      "https://${REF}.supabase.co"
append_if_missing "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$ANON"
append_if_missing "SUPABASE_SERVICE_ROLE_KEY"     "$SERVICE"
append_if_missing "NEXT_PUBLIC_SITE_URL"          "http://localhost:3000"
