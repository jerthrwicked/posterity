#!/usr/bin/env bash
# Build Posterity for Cloudflare Workers WITHOUT baking server secrets in.
#
# ⚠️ OpenNext copies every .env* file in the project root into
# .open-next/cloudflare/next-env.mjs, which ships inside the Worker. That put the
# Supabase service-role key, the Stripe secret key and the Supabase management
# token into the bundle on the first try (2026-10-10). Server secrets belong in
# `wrangler secret put`; only NEXT_PUBLIC_* values are needed at build time,
# because Next inlines them into the client JS.
#
# This hides .env.local for the length of the build, exports the public values
# only, and puts .env.local back on any exit. Build command for Cloudflare:
#   bash scripts/cf-build.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Two places this runs: a laptop (public values come from .env.local) and
# Cloudflare's GitHub build (no .env.local; public values are build variables).
if [ -f .env.local ]; then
  [ ! -e .env.local.cfbuild ] || { echo ".env.local.cfbuild exists — a previous build died; restore it by hand first"; exit 1; }
  # A value already in the environment wins over .env.local, so a production
  # build can set NEXT_PUBLIC_SITE_URL without editing the local file.
  while IFS= read -r line; do
    k=${line%%=*}
    [ -n "${!k:-}" ] || { eval "$line"; export "$k"; }
  done < <(grep -E '^NEXT_PUBLIC_[A-Z_]+=' .env.local)
  mv .env.local .env.local.cfbuild
  trap 'mv .env.local.cfbuild .env.local' EXIT
fi
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY NEXT_PUBLIC_SITE_URL; do
  [ -n "${!v:-}" ] || { echo "❌ $v is not set — the client JS would ship without it"; exit 1; }
done
for f in .env .env.production .env.production.local; do
  [ ! -e "$f" ] || { echo "❌ $f exists and would be baked into the Worker — move it"; exit 1; }
done
npx opennextjs-cloudflare build

# Fail loudly if any non-public key name still made it into the bundle.
if grep -qE 'SERVICE_ROLE|STRIPE_SECRET|SUPABASE_ACCESS_TOKEN' .open-next/cloudflare/next-env.mjs 2>/dev/null; then
  echo "❌ a server secret name is in next-env.mjs — do not deploy this build"; exit 1
fi
echo "✅ built; next-env.mjs holds public values only"
