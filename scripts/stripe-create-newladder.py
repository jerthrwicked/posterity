#!/usr/bin/env python3
# Posterity — create the July-2026 ladder prices in Stripe TEST mode · Walker Brown
"""Creates the two missing one-time prices (Premium $129, Legacy $399) on the existing
Posterity products, to match the July-2026 recommended ladder. Basic $49 already exists.
Reads the key from .env.local; never prints it. TEST mode only (refuses live keys).
Additive only — creates new prices, never deletes/archives anything."""
import json, os, sys, urllib.request, urllib.parse

env = {}
with open(os.path.expanduser("~/posterity/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

key = env.get("STRIPE_SECRET_KEY", "")
if not key.startswith("sk_test_"):
    sys.exit("✗ refusing to run: STRIPE_SECRET_KEY is not a sk_test_ key")

def api(path, data=None):
    url = "https://api.stripe.com/v1/" + path
    body = urllib.parse.urlencode(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers={"Authorization": "Bearer " + key})
    try:
        return json.load(urllib.request.urlopen(req))
    except urllib.error.HTTPError as e:
        sys.exit("✗ Stripe error: " + json.load(e).get("error", {}).get("message", str(e)))

# find product ids by name
prods = {p["name"]: p["id"] for p in api("products?limit=100").get("data", [])}
want = {"Posterity Premium": 12900, "Posterity Legacy": 39900}
for name, cents in want.items():
    pid = prods.get(name)
    if not pid:
        print(f"✗ product not found: {name} — skipping")
        continue
    price = api("prices", {
        "product": pid,
        "unit_amount": str(cents),
        "currency": "usd",
        # one-time, matching the existing Basic/Premium/Legacy model (plans paid upfront per plan-year)
    })
    print(f"✓ created {name:<20} ${cents/100:>7,.2f}  {price['id']}")
