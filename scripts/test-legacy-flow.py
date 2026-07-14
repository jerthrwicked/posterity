#!/usr/bin/env python3
# Posterity — end-to-end legacy flow test · Walker Brown
"""
Signup -> account -> legacy -> recipient -> message, against the live database,
through PostgREST as a real signed-in user (so RLS is actually exercised).

Also checks the two things that matter most:
  - a recipient with no email and no phone is REJECTED
  - one customer cannot see another customer's legacy
"""
import json, os, sys, urllib.request, urllib.error

env = {}
with open(os.path.expanduser("~/posterity/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

URL = env["NEXT_PUBLIC_SUPABASE_URL"]
ANON = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
SERVICE = env["SUPABASE_SERVICE_ROLE_KEY"]

def call(path, method="GET", body=None, token=None, prefer=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", ANON)
    req.add_header("Authorization", "Bearer " + (token or ANON))
    req.add_header("Content-Type", "application/json")
    if prefer:
        req.add_header("Prefer", prefer)
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, raw.decode()

def admin_create(email):
    req = urllib.request.Request(URL + "/auth/v1/admin/users", method="POST")
    req.add_header("apikey", SERVICE)
    req.add_header("Authorization", "Bearer " + SERVICE)
    req.add_header("Content-Type", "application/json")
    body = json.dumps({"email": email, "password": "test-password-123",
                       "email_confirm": True, "user_metadata": {"full_name": "Flow Test"}}).encode()
    with urllib.request.urlopen(req, body) as r:
        return json.load(r)["id"]

def admin_delete(uid):
    req = urllib.request.Request(URL + f"/auth/v1/admin/users/{uid}", method="DELETE")
    req.add_header("apikey", SERVICE)
    req.add_header("Authorization", "Bearer " + SERVICE)
    urllib.request.urlopen(req).read()

def sign_in(email):
    st, r = call("/auth/v1/token?grant_type=password",
                 "POST", {"email": email, "password": "test-password-123"})
    assert st == 200, r
    return r["access_token"]

A = "flow-a@posterity.app"
B = "flow-b@posterity.app"
uid_a = uid_b = None
fails = 0

def check(label, cond, detail=""):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + label + (f"  [{detail}]" if detail and not cond else ""))
    if not cond:
        fails += 1

try:
    print("Customer A signs up")
    uid_a = admin_create(A)
    tok_a = sign_in(A)

    st, accounts = call("/rest/v1/accounts?select=id,phase", token=tok_a)
    check("account created automatically, in horizon phase",
          st == 200 and len(accounts) == 1 and accounts[0]["phase"] == "horizon", f"{st} {accounts}")
    acct_a = accounts[0]["id"]

    st, legacies = call("/rest/v1/legacies?select=id,is_primary", token=tok_a)
    check("primary legacy created automatically",
          st == 200 and len(legacies) == 1 and legacies[0]["is_primary"], f"{st} {legacies}")

    print("\nThe memorialization guard")
    st, r = call("/rest/v1/recipients", "POST",
                 {"account_id": acct_a, "name": "Meta Only",
                  "platform": "facebook", "platform_handle": "@them"},
                 token=tok_a, prefer="return=representation")
    check("recipient with NO email and NO phone is REJECTED", st >= 400, f"got {st}")

    print("\nCustomer A builds a legacy")
    st, rec = call("/rest/v1/recipients", "POST",
                   {"account_id": acct_a, "name": "Daughter",
                    "email": "daughter@example.com", "platform": "facebook"},
                   token=tok_a, prefer="return=representation")
    check("recipient with an email is accepted", st in (200, 201), f"{st} {rec}")
    rec_id = rec[0]["id"]

    st, leg = call("/rest/v1/legacies?select=id", token=tok_a)
    st, item = call("/rest/v1/content_items", "POST",
                    {"legacy_id": leg[0]["id"], "account_id": acct_a, "kind": "message",
                     "title": "Her 30th", "body": "I am so proud of you.",
                     "recipient_id": rec_id, "deliver_on": "2044-06-01"},
                    token=tok_a, prefer="return=representation")
    check("message saved to the legacy", st in (200, 201), f"{st} {item}")

    st, items = call("/rest/v1/content_items?select=title,body,deliver_on,recipients(name)", token=tok_a)
    check("A can read it back",
          st == 200 and len(items) == 1 and items[0]["recipients"]["name"] == "Daughter", f"{st} {items}")

    print("\nCustomer B must not see any of it")
    uid_b = admin_create(B)
    tok_b = sign_in(B)
    st, b_items = call("/rest/v1/content_items?select=id", token=tok_b)
    check("B sees ZERO of A's messages", st == 200 and len(b_items) == 0, f"{st} {b_items}")
    st, b_recs = call("/rest/v1/recipients?select=id", token=tok_b)
    check("B sees ZERO of A's recipients", st == 200 and len(b_recs) == 0, f"{st} {b_recs}")

finally:
    print("\nCleanup")
    for uid in (uid_a, uid_b):
        if uid:
            admin_delete(uid)
    print("  test users deleted")

print()
if fails:
    print(f"✗ {fails} check(s) FAILED")
    sys.exit(1)
print("✓ all checks passed")
