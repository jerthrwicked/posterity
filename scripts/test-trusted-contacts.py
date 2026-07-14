#!/usr/bin/env python3
# Posterity — trusted contacts test · Walker Brown
"""
Exercises trusted contacts against the live database as real signed-in users.

The one that matters most: the set_primary_trusted_contact RPC is SECURITY
INVOKER, so a customer must NOT be able to promote a contact on someone else's
account. A SECURITY DEFINER function here would silently bypass RLS.
"""
import json, os, sys, urllib.request, urllib.error

env = {}
with open(os.path.expanduser("~/posterity/.env.local")) as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()

URL, ANON, SERVICE = env["NEXT_PUBLIC_SUPABASE_URL"], env["NEXT_PUBLIC_SUPABASE_ANON_KEY"], env["SUPABASE_SERVICE_ROLE_KEY"]

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
    for h, v in (("apikey", SERVICE), ("Authorization", "Bearer " + SERVICE), ("Content-Type", "application/json")):
        req.add_header(h, v)
    body = json.dumps({"email": email, "password": "test-password-123", "email_confirm": True}).encode()
    with urllib.request.urlopen(req, body) as r:
        return json.load(r)["id"]

def admin_delete(uid):
    req = urllib.request.Request(URL + f"/auth/v1/admin/users/{uid}", method="DELETE")
    for h, v in (("apikey", SERVICE), ("Authorization", "Bearer " + SERVICE)):
        req.add_header(h, v)
    urllib.request.urlopen(req).read()

def sign_in(email):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": "test-password-123"})
    assert st == 200, r
    return r["access_token"]

fails = 0
def check(label, cond, detail=""):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + label + (f"  [{detail}]" if detail and not cond else ""))
    if not cond:
        fails += 1

A, B = "tc-a@posterity.app", "tc-b@posterity.app"
uid_a = uid_b = None

try:
    uid_a = admin_create(A); tok_a = sign_in(A)
    uid_b = admin_create(B); tok_b = sign_in(B)
    _, acc_a = call("/rest/v1/accounts?select=id", token=tok_a)
    acct_a = acc_a[0]["id"]

    print("Reachability")
    st, _ = call("/rest/v1/trusted_contacts", "POST",
                 {"account_id": acct_a, "name": "Unreachable"}, token=tok_a)
    check("a contact with no email and no phone is REJECTED", st >= 400, f"got {st}")

    print("\nPrimary")
    st, c1 = call("/rest/v1/trusted_contacts", "POST",
                  {"account_id": acct_a, "name": "Brother", "email": "b@example.com", "is_primary": True},
                  token=tok_a, prefer="return=representation")
    check("first contact added as primary", st in (200, 201), f"{st} {c1}")
    st, c2 = call("/rest/v1/trusted_contacts", "POST",
                  {"account_id": acct_a, "name": "Sister", "email": "s@example.com", "is_primary": False},
                  token=tok_a, prefer="return=representation")
    check("second contact added", st in (200, 201), f"{st} {c2}")
    id1, id2 = c1[0]["id"], c2[0]["id"]

    st, _ = call("/rest/v1/trusted_contacts?id=eq." + id2, "PATCH",
                 {"is_primary": True}, token=tok_a)
    check("two primaries at once is REJECTED by the unique index", st >= 400, f"got {st}")

    st, _ = call("/rest/v1/rpc/set_primary_trusted_contact", "POST",
                 {"p_contact_id": id2}, token=tok_a)
    check("promoting via the RPC succeeds", st in (200, 204), f"got {st}")

    st, cs = call("/rest/v1/trusted_contacts?select=name,is_primary", token=tok_a)
    primaries = [c["name"] for c in cs if c["is_primary"]]
    check("exactly one primary, and it is the promoted one",
          primaries == ["Sister"], f"{primaries}")

    print("\nThe RPC must not cross accounts")
    st, r = call("/rest/v1/rpc/set_primary_trusted_contact", "POST",
                 {"p_contact_id": id1}, token=tok_b)
    # RLS hides A's rows from B, so the function's own lookup finds nothing and raises.
    check("customer B CANNOT promote customer A's contact", st >= 400, f"got {st} {r}")

    st, cs = call("/rest/v1/trusted_contacts?select=name,is_primary", token=tok_a)
    primaries = [c["name"] for c in cs if c["is_primary"]]
    check("A's primary is untouched after B's attempt", primaries == ["Sister"], f"{primaries}")

    st, b_sees = call("/rest/v1/trusted_contacts?select=id", token=tok_b)
    check("B sees ZERO of A's trusted contacts", st == 200 and len(b_sees) == 0, f"{st} {b_sees}")

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
