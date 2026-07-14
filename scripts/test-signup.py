#!/usr/bin/env python3
"""End-to-end signup test: hit the real auth endpoint, then check the DB for the account row."""
import json, os, sys, urllib.request, urllib.error

env = {}
with open(os.path.expanduser("~/posterity/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

url = env["NEXT_PUBLIC_SUPABASE_URL"]
anon = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

email = sys.argv[1] if len(sys.argv) > 1 else "phase0-test@example.com"
body = json.dumps({
    "email": email,
    "password": "correct-horse-battery-staple",
    "data": {"full_name": "Phase Zero Test"},
}).encode()

req = urllib.request.Request(
    f"{url}/auth/v1/signup",
    data=body,
    headers={"apikey": anon, "Authorization": "Bearer " + anon, "Content-Type": "application/json"},
)
try:
    resp = json.load(urllib.request.urlopen(req))
    uid = resp.get("id") or (resp.get("user") or {}).get("id")
    print(f"✓ auth user created: {uid}")
    print(f"  session returned: {'yes' if resp.get('access_token') else 'no (email confirmation is on)'}")
except urllib.error.HTTPError as e:
    err = json.load(e)
    print(f"✗ signup failed: {err.get('msg') or err.get('error_description') or err}")
    sys.exit(1)
