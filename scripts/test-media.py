#!/usr/bin/env python3
# Posterity — media storage security test · Walker Brown
"""
Tries to break into another customer's files.

This bucket holds a man's last video to his daughter. The tests that matter are
not "can I upload" — they are "can somebody ELSE get at it."
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
BUCKET = "legacy-media"

def req(path, method="GET", body=None, token=None, ctype="application/json", raw=False):
    r = urllib.request.Request(URL + path, method=method)
    r.add_header("apikey", ANON)
    r.add_header("Authorization", "Bearer " + (token or ANON))
    if body is not None:
        r.add_header("Content-Type", ctype)
    data = body if raw else (json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(r, data) as resp:
            b = resp.read()
            try:
                return resp.status, json.loads(b)
            except Exception:
                return resp.status, b
    except urllib.error.HTTPError as e:
        b = e.read()
        try:
            return e.code, json.loads(b)
        except Exception:
            return e.code, b.decode(errors="replace")[:120]

def admin_create(email):
    r = urllib.request.Request(URL + "/auth/v1/admin/users", method="POST")
    for h, v in (("apikey", SERVICE), ("Authorization", "Bearer " + SERVICE), ("Content-Type", "application/json")):
        r.add_header(h, v)
    with urllib.request.urlopen(r, json.dumps(
        {"email": email, "password": "test-password-123", "email_confirm": True}).encode()) as resp:
        return json.load(resp)["id"]

def admin_delete(uid):
    r = urllib.request.Request(URL + f"/auth/v1/admin/users/{uid}", method="DELETE")
    for h, v in (("apikey", SERVICE), ("Authorization", "Bearer " + SERVICE)):
        r.add_header(h, v)
    urllib.request.urlopen(r).read()

def sign_in(email):
    st, r = req("/auth/v1/token?grant_type=password", "POST",
                {"email": email, "password": "test-password-123"})
    assert st == 200, r
    return r["access_token"]

fails = 0
def check(label, cond, detail=""):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + label + (f"  [{detail}]" if detail and not cond else ""))
    if not cond:
        fails += 1

# a 1x1 png
PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082")

A, B = "media-a@posterity.app", "media-b@posterity.app"
uid_a = uid_b = None

try:
    uid_a = admin_create(A); tok_a = sign_in(A)
    uid_b = admin_create(B); tok_b = sign_in(B)
    _, acc_a = req("/rest/v1/accounts?select=id", token=tok_a); acct_a = acc_a[0]["id"]
    _, acc_b = req("/rest/v1/accounts?select=id", token=tok_b); acct_b = acc_b[0]["id"]
    _, leg_a = req("/rest/v1/legacies?select=id", token=tok_a); leg_a = leg_a[0]["id"]

    path_a = f"{acct_a}/{leg_a}/private.png"

    print("Customer A uploads")
    st, r = req(f"/storage/v1/object/{BUCKET}/{path_a}", "POST", PNG,
                token=tok_a, ctype="image/png", raw=True)
    check("A can upload into her own folder", st in (200, 201), f"{st} {r}")

    st, r = req(f"/storage/v1/object/sign/{BUCKET}/{path_a}", "POST",
                {"expiresIn": 3600}, token=tok_a)
    check("A can mint a signed URL for her own file", st == 200 and "signedURL" in (r or {}), f"{st} {r}")
    signed = (r or {}).get("signedURL", "")

    print("\nCan anyone else get at it?")

    st, r = req(f"/storage/v1/object/{BUCKET}/{path_a}", token=tok_b)
    check("B CANNOT download A's file", st >= 400, f"got {st}")

    st, r = req(f"/storage/v1/object/sign/{BUCKET}/{path_a}", "POST",
                {"expiresIn": 3600}, token=tok_b)
    check("B CANNOT mint a signed URL for A's file", st >= 400, f"got {st}")

    st, r = req(f"/storage/v1/object/{BUCKET}/{acct_a}/{leg_a}/planted.png", "POST", PNG,
                token=tok_b, ctype="image/png", raw=True)
    check("B CANNOT upload INTO A's folder", st >= 400, f"got {st}")

    st, r = req(f"/storage/v1/object/public/{BUCKET}/{path_a}")
    check("the public URL does NOT work (bucket is private)", st >= 400, f"got {st}")

    st, r = req(f"/storage/v1/object/{BUCKET}/{path_a}")
    check("an anonymous request CANNOT download it", st >= 400, f"got {st}")

    st, r = req("/storage/v1/object/list/" + BUCKET, "POST",
                {"prefix": acct_a, "limit": 100}, token=tok_b)
    listed = r if isinstance(r, list) else []
    check("B CANNOT list A's folder", st >= 400 or len(listed) == 0, f"{st} {r}")

    print("\nThe signed URL A minted still works (it should)")
    st, r = req("/storage/v1/" + signed.lstrip("/"))
    check("A's signed URL downloads the file", st == 200, f"got {st}")

    print("\nBucket limits are enforced server-side")
    st, r = req(f"/storage/v1/object/{BUCKET}/{acct_a}/{leg_a}/too-big.png", "POST",
                b"x" * (26 * 1024 * 1024), token=tok_a, ctype="image/png", raw=True)
    check("a file over 25MB is REJECTED by the bucket", st >= 400, f"got {st}")

    st, r = req(f"/storage/v1/object/{BUCKET}/{acct_a}/{leg_a}/nasty.html", "POST",
                b"<script>alert(1)</script>", token=tok_a, ctype="text/html", raw=True)
    check("a disallowed file type is REJECTED by the bucket", st >= 400, f"got {st}")

finally:
    print("\nCleanup")
    for uid in (uid_a, uid_b):
        if uid:
            admin_delete(uid)
    print("  test users and their files deleted")

print()
if fails:
    print(f"✗ {fails} check(s) FAILED")
    sys.exit(1)
print("✓ all checks passed")
