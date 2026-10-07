#!/usr/bin/env python3
# Posterity — the storage gate, tested live as a real signed-in user · Walker Brown
"""
Master Spec, Horizon Tier: the three-month trial "grants content building";
"when the trial ends, content creation locks. The account itself remains
accessible." Storage Lapse Grace Period: the customer "can log in and view all
content, but cannot build or edit until storage is current."

Through PostgREST with the customer's own token, so row-level security is the
thing under test:
  - a new account is in trial and can build
  - trial over, nothing paid: insert and update are REFUSED, select and delete
    still work, the media bucket refuses an upload
  - storage paid through today: building is open again
  - storage paid through yesterday: closed again
  - the customer cannot move their own trial or paid-through date
The trial and paid-through dates are moved with the service role, standing in
for the webhook, which is the only thing that will ever write them.
"""
import datetime as dt, json, os, sys, urllib.request, urllib.error

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

def call(path, method="GET", body=None, token=None, prefer=None, raw=None, ctype="application/json"):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", ANON)
    req.add_header("Authorization", "Bearer " + (token or ANON))
    req.add_header("Content-Type", ctype)
    if prefer:
        req.add_header("Prefer", prefer)
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.urlopen(req, data) as r:
            out = r.read()
            return r.status, (json.loads(out) if out else None)
    except urllib.error.HTTPError as e:
        out = e.read()
        try:
            return e.code, json.loads(out)
        except Exception:
            return e.code, out.decode()

def admin_create(email):
    req = urllib.request.Request(URL + "/auth/v1/admin/users", method="POST")
    req.add_header("apikey", SERVICE)
    req.add_header("Authorization", "Bearer " + SERVICE)
    req.add_header("Content-Type", "application/json")
    body = json.dumps({"email": email, "password": "test-password-123",
                       "email_confirm": True, "user_metadata": {"full_name": "Gate Test"}}).encode()
    try:
        with urllib.request.urlopen(req, body) as r:
            return json.load(r)["id"]
    except urllib.error.HTTPError as e:
        if e.code != 422:
            raise
        # Left over from a run that crashed before cleanup. Remove it and retry once.
        admin_delete(admin_find(email))
        with urllib.request.urlopen(req, body) as r:
            return json.load(r)["id"]

def admin_find(email):
    q = urllib.request.Request(URL + "/auth/v1/admin/users?page=1&per_page=200")
    q.add_header("apikey", SERVICE)
    q.add_header("Authorization", "Bearer " + SERVICE)
    users = json.load(urllib.request.urlopen(q)).get("users", [])
    return next(u["id"] for u in users if u.get("email") == email)

def admin_delete(uid):
    req = urllib.request.Request(URL + f"/auth/v1/admin/users/{uid}", method="DELETE")
    req.add_header("apikey", SERVICE)
    req.add_header("Authorization", "Bearer " + SERVICE)
    urllib.request.urlopen(req).read()

def set_dates(acct, **cols):
    # The webhook's job, stood in for here.
    st, r = call(f"/rest/v1/accounts?id=eq.{acct}", "PATCH", cols, token=SERVICE, prefer="return=representation")
    assert st == 200 and len(r) == 1, (st, r)

def sign_in(email):
    st, r = call("/auth/v1/token?grant_type=password", "POST",
                 {"email": email, "password": "test-password-123"})
    assert st == 200, r
    return r["access_token"]

PNG = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c6360000002000100ffff03000006000557bfabd400"
    "00000049454e44ae426082")
EMAIL = "gate-test@posterity.app"
uid = acct = legacy = None
fails = 0

def check(label, cond, detail=""):
    global fails
    print(("  ✓ " if cond else "  ✗ ") + label + (f"  [{detail}]" if detail and not cond else ""))
    if not cond:
        fails += 1

def is_current(acct, tok):
    st, r = call("/rest/v1/rpc/storage_is_current", "POST", {"p_account_id": acct}, token=tok)
    return r if st == 200 else f"{st} {r}"

def try_recipient(acct, tok, name):
    return call("/rest/v1/recipients", "POST",
                {"account_id": acct, "name": name, "email": f"{name.lower()}@example.com"},
                token=tok, prefer="return=representation")

# The product's "today" for a paid-through date: the date in UTC-12, so a date
# holds until it has ended everywhere on earth (see 20260918123000).
today = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(hours=12)).date()
yesterday = today - dt.timedelta(days=1)

try:
    print("A new account")
    uid = admin_create(EMAIL)
    tok = sign_in(EMAIL)
    st, accts = call("/rest/v1/accounts?select=id,created_at,trial_ends_at,storage_paid_through", token=tok)
    check("account row visible to its owner", st == 200 and len(accts) == 1, f"{st} {accts}")
    acct = accts[0]["id"]
    created = dt.datetime.fromisoformat(accts[0]["created_at"].replace("Z", "+00:00"))
    ends = dt.datetime.fromisoformat(accts[0]["trial_ends_at"].replace("Z", "+00:00"))
    check("trial ends three months after signup", 88 <= (ends - created).days <= 93, f"{(ends - created).days} days")
    check("nothing paid yet", accts[0]["storage_paid_through"] is None)
    check("storage_is_current() says yes during the trial", is_current(acct, tok) is True, str(is_current(acct, tok)))

    st, leg = call("/rest/v1/legacies?select=id", token=tok)
    legacy = leg[0]["id"]
    st, rec = try_recipient(acct, tok, "Daughter")
    check("can add a recipient during the trial", st in (200, 201), f"{st} {rec}")
    rec_id = rec[0]["id"]
    st, item = call("/rest/v1/content_items", "POST",
                    {"legacy_id": legacy, "account_id": acct, "kind": "message",
                     "title": "Her 30th", "body": "I am so proud of you.",
                     "recipient_id": rec_id, "deliver_on": "2044-06-01"},
                    token=tok, prefer="return=representation")
    check("can write a message during the trial", st in (200, 201), f"{st} {item}")
    item_id = item[0]["id"]
    st, r = call(f"/storage/v1/object/legacy-media/{acct}/{legacy}/gate-test.png", "POST",
                 token=tok, raw=PNG, ctype="image/png")
    check("can upload to the media bucket during the trial", st in (200, 201), f"{st} {r}")

    print("\nThe customer cannot move their own dates")
    st, r = call(f"/rest/v1/accounts?id=eq.{acct}", "PATCH",
                 {"trial_ends_at": "2099-01-01T00:00:00Z"}, token=tok, prefer="return=representation")
    check("extending their own trial is REFUSED", st >= 400, f"got {st} {r}")
    st, r = call(f"/rest/v1/accounts?id=eq.{acct}", "PATCH",
                 {"storage_paid_through": "2099-01-01"}, token=tok, prefer="return=representation")
    check("marking their own storage paid is REFUSED", st >= 400, f"got {st} {r}")
    st, accts = call("/rest/v1/accounts?select=trial_ends_at,storage_paid_through", token=tok)
    check("and the dates did not move",
          accts[0]["trial_ends_at"][:10] != "2099-01-01" and accts[0]["storage_paid_through"] is None,
          str(accts))

    print("\nTrial over, nothing paid")
    set_dates(acct, trial_ends_at=(dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=1)).isoformat())
    check("storage_is_current() says no", is_current(acct, tok) is False, str(is_current(acct, tok)))
    st, r = try_recipient(acct, tok, "Son")
    check("adding a recipient is REFUSED", st >= 400, f"got {st} {r}")
    st, r = call("/rest/v1/content_items", "POST",
                 {"legacy_id": legacy, "account_id": acct, "kind": "message",
                  "body": "One more.", "recipient_id": rec_id, "deliver_on": "2044-07-01"},
                 token=tok, prefer="return=representation")
    check("writing a message is REFUSED", st >= 400, f"got {st} {r}")
    st, r = call(f"/rest/v1/content_items?id=eq.{item_id}", "PATCH",
                 {"body": "Edited."}, token=tok, prefer="return=representation")
    check("editing a message is REFUSED (no row updated)", st >= 400 or r == [], f"got {st} {r}")
    st, items = call("/rest/v1/content_items?select=id,body", token=tok)
    check("the customer can still read everything",
          st == 200 and len(items) == 1 and items[0]["body"] == "I am so proud of you.", f"{st} {items}")
    st, r = call(f"/storage/v1/object/legacy-media/{acct}/{legacy}/gate-test-2.png", "POST",
                 token=tok, raw=PNG, ctype="image/png")
    check("an upload to the media bucket is REFUSED", st >= 400, f"got {st} {r}")
    st, r = call(f"/rest/v1/content_items?id=eq.{item_id}", "DELETE", token=tok, prefer="return=representation")
    check("the customer can still delete their own message", st in (200, 204) and len(r or []) == 1, f"{st} {r}")

    print("\nStorage paid through today")
    set_dates(acct, storage_paid_through=today.isoformat())
    check("storage_is_current() says yes", is_current(acct, tok) is True, str(is_current(acct, tok)))
    st, r = try_recipient(acct, tok, "Son")
    check("adding a recipient works again", st in (200, 201), f"{st} {r}")

    print("\nStorage paid through yesterday")
    set_dates(acct, storage_paid_through=yesterday.isoformat())
    check("storage_is_current() says no", is_current(acct, tok) is False, str(is_current(acct, tok)))
    st, r = try_recipient(acct, tok, "Niece")
    check("adding a recipient is REFUSED", st >= 400, f"got {st} {r}")

finally:
    print("\nCleanup")
    if uid:
        # The account's files first — deleting a user does not delete their storage
        # files. The bulk endpoint takes a JSON body; a single-object DELETE with a
        # JSON content type and no body is refused, which is how two orphans were
        # left behind on the first runs. The status is checked, not assumed.
        if acct and legacy:
            st, r = call("/storage/v1/object/legacy-media", "DELETE",
                         {"prefixes": [f"{acct}/{legacy}/gate-test.png", f"{acct}/{legacy}/gate-test-2.png"]},
                         token=SERVICE)
            removed = [o["name"] for o in (r or [])] if st == 200 else []
            print(f"  {'✓' if st == 200 else '✗'} test files removed from the bucket ({len(removed)}) [{st}]")
            if st != 200:
                fails += 1
        admin_delete(uid)
        print("  test user deleted")

print()
if fails:
    print(f"✗ {fails} check(s) FAILED")
    sys.exit(1)
print("✓ all checks passed")
