#!/usr/bin/env python3
# Posterity — list Stripe test-mode prices · Walker Brown
"""List the prices that exist in Stripe TEST mode. Reads the key from .env.local; never prints it."""
import json, os, sys, urllib.request

env = {}
with open(os.path.expanduser("~/posterity/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

key = env.get("STRIPE_SECRET_KEY", "")
if not key.startswith("sk_test_"):
    sys.exit("✗ no test-mode STRIPE_SECRET_KEY in .env.local")

req = urllib.request.Request(
    "https://api.stripe.com/v1/prices?limit=100&expand[]=data.product",
    headers={"Authorization": "Bearer " + key},
)
try:
    data = json.load(urllib.request.urlopen(req))
except urllib.error.HTTPError as e:
    body = json.load(e).get("error", {})
    sys.exit("✗ Stripe rejected the key: " + body.get("message", str(e)))

prices = data.get("data", [])
print(f"✓ key valid. {len(prices)} price(s) in TEST mode:")
for p in prices:
    amt = p.get("unit_amount")
    amt = f"${amt/100:,.2f}" if amt is not None else "—"
    rec = p.get("recurring")
    rec = f"recurring/{rec['interval']}" if rec else "ONE-TIME"
    prod = p.get("product") or {}
    name = prod.get("name") if isinstance(prod, dict) else ""
    print(f"   {p['id']:<32} {amt:>10}  {rec:<18} {name or ''}")
if not prices:
    print("   (none — the four plans exist only in LIVE mode; I'll need to create them here)")
