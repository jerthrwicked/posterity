#!/usr/bin/env bash
# Posterity — add the Stripe test key to .env.local · Walker Brown
# Add Jeremy's Stripe TEST secret key to .env.local.
# The key is read silently — it never appears on screen, in shell history, or in the transcript.
set -euo pipefail

ENV_FILE="${HOME}/posterity/.env.local"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 1; }

echo "Paste the Stripe TEST secret key (starts with sk_test_), then press Enter."
echo "Nothing will show as you paste. Ctrl-C to cancel."
read -rs KEY
echo

[ -n "$KEY" ] || { echo "✗ Nothing entered. Aborted."; exit 1; }

case "$KEY" in
  sk_live_*)
    echo "✗ That is a LIVE key. Refusing to write it."
    echo "  We are about to exercise checkout repeatedly — use the test key."
    echo "  Stripe → Developers → API keys, with the 'Test mode' toggle ON."
    exit 1
    ;;
  sk_test_*) ;;
  *)
    echo "✗ That doesn't look like a Stripe secret key (expected it to start with sk_test_)."
    echo "  Not written. Nothing was echoed."
    exit 1
    ;;
esac

# Replace an existing line rather than appending a duplicate
if grep -q '^STRIPE_SECRET_KEY=' "$ENV_FILE"; then
  KEY="$KEY" python3 - "$ENV_FILE" <<'PY'
import os, sys
path = sys.argv[1]
key = os.environ["KEY"]
lines = open(path).read().splitlines()
out = [("STRIPE_SECRET_KEY=" + key) if l.startswith("STRIPE_SECRET_KEY=") else l for l in lines]
open(path, "w").write("\n".join(out) + "\n")
PY
  echo "✓ STRIPE_SECRET_KEY updated in .env.local (${#KEY} chars, test mode)."
else
  printf 'STRIPE_SECRET_KEY=%s\n' "$KEY" >> "$ENV_FILE"
  echo "✓ STRIPE_SECRET_KEY written to .env.local (${#KEY} chars, test mode)."
fi

unset KEY
echo "  .env.local is gitignored — it will not be committed."
