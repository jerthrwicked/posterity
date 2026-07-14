#!/usr/bin/env bash
# Posterity — run SQL against the live Supabase · Walker Brown
# Run SQL against Jeremy's Posterity Supabase via the Management API.
#
# Reads SUPABASE_ACCESS_TOKEN (+ optional SUPABASE_PROJECT_REF) from
# ~/posterity/.env.local — the token never appears on the command line or in
# shell history.
#
#   scripts/sb.sh "select table_name from information_schema.tables where table_schema='public'"
#   scripts/sb.sh -f some_file.sql
set -euo pipefail

ENV_FILE="${HOME}/posterity/.env.local"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

: "${SUPABASE_ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN not set in .env.local}"
REF="${SUPABASE_PROJECT_REF:-vypytfmutmeyfwmkapjg}"

if [ "${1:-}" = "-f" ]; then
  [ -f "${2:-}" ] || { echo "no such file: ${2:-}" >&2; exit 1; }
  QUERY="$(cat "$2")"
else
  QUERY="${1:?usage: sb.sh \"<sql>\" | sb.sh -f file.sql}"
fi

BODY="$(QUERY="$QUERY" python3 -c 'import json,os; print(json.dumps({"query": os.environ["QUERY"]}))')"

curl -sS --max-time 60 \
  -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$BODY"
echo
