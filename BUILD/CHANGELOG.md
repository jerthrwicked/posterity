# Posterity — Changelog · Walker Brown

Everything Walker + Claude have changed. Newest first.

**Jeremy — read this first.** We work on the `walker/build` branch and **never push to your repo**, so
GitHub will not tell you anything happened. **This file is the only record you get.** Two kinds of
change appear below, and they are not equally reversible:

- 🗄️ **DATABASE** — applied to your live Supabase (`vypytfmutmeyfwmkapjg`). **Already in effect.**
  Undoing these takes a migration, not a `git reset`.
- 📄 **CODE / DOCS** — local, on a branch. Nothing is deployed, nothing reaches your repo.

**Decisions only you can make are collected under [Findings](#-findings--decisions-only-jeremy-can-make).**

---

# 2026-07-13

## ✅ Phase 1.1 — you can write a message now

**Nobody has ever created a single piece of content in Posterity.** That changes here. `/dashboard`
now leads to two pages that work:

- **`/dashboard/recipients`** — add the people your legacy is for, once, and reuse them.
- **`/dashboard/legacy`** — write a message, choose who it's for, choose the date it arrives, and
  choose whether it stays in Posterity afterward. It saves, it lists, it deletes.
- **`/dashboard/trusted-contacts`** — name the people who can speak for your account, write each of
  them a private note, and set which one is primary.

Media upload (video/photo) is **not** here — it needs Supabase Storage and client-side compression,
and it's the next slice. Text messages are the spine of the product and they work end to end.

**Verified against the live database as a real signed-in user, so RLS was actually exercised**
(`scripts/test-legacy-flow.py`, all 8 checks pass): the account and legacy are created automatically,
a recipient with no email and no phone is **rejected**, a message saves and reads back with its
recipient — and **a second customer sees zero of the first customer's messages and recipients.**

## 🗄️ Database — three migrations, applied and live

The database **was completely empty**: zero tables, no migration history, nothing had ever run. It is
not empty now.

| Migration | What it does |
|---|---|
| `20260713000000_initial_schema.sql` | **The first migration this project has ever had.** 14 tables, RLS on every one, 6 enums. |
| `20260713120000_account_on_signup.sql` | A trigger on `auth.users` that creates the account row **in the same transaction as the user**. Plus a backfill. |
| `20260713140000_fallback_and_legacy.sql` | **A recipient must have an email or a phone.** And every account gets its primary legacy at signup. |
| `20260713160000_trusted_contacts.sql` | **A trusted contact must have an email or a phone.** And promoting a primary happens in one transaction, in the database. |

### Why the recipient constraint matters — this is Finding 3, enforced
`recipients.email` and `recipients.phone` were **both nullable**, so a customer could add a recipient
reachable **only by a Facebook handle**. If that account is later memorialized — which **any relative
can trigger**, and which locks the account against all posting **forever** — that message has
**nowhere to go.** Not a failed delivery: no delivery is *possible*, and we'd find out on the day it
was meant to arrive.

The database now **refuses a recipient it could not reach without Meta.** Tested: the insert is
rejected.

This was free to add **while the table was empty**. Once there is real content, adding it means
backfilling recipients whose customers may already be gone. It was now or never.

### Trusted contacts — reachability, and one primary
Same constraint on `trusted_contacts`, and **the stakes are higher**. An unreachable *recipient* means
a message doesn't land. An unreachable *trusted contact* means **the six-notification escalation has
nowhere to go** — nobody can confirm, nobody can be told, and the account either fires on non-response
alone or never fires at all. Both are bad, and neither is a thing to discover at the moment it matters.

Promoting a primary now runs in **one database transaction** (`set_primary_trusted_contact`), because
`trusted_contacts_one_primary` is a unique partial index: clearing the old primary and setting the new
one must happen together. As two round-trips from the app, a failure between them leaves a customer
with **no primary contact and no sign anything went wrong.**

The function is **SECURITY INVOKER**, so RLS applies and a customer can only promote a contact on their
own account. **Tested explicitly** — customer B cannot promote customer A's contact, and A's primary is
untouched by the attempt. (A `SECURITY DEFINER` function here would have silently bypassed RLS. It's
the kind of mistake that looks identical in a diff.)

### What is deliberately NOT built: the trusted contact's button
The invite, the portal, and the **confirmation** are not here. A trusted contact's confirmation is one
of the three ways the trigger fires — **the single most dangerous input in this product** — and it
ships with its safeguards (double verification, the escalation, a human-in-the-loop hold) or it does
not ship. **Naming the people is safe. Letting them press the button is not, yet.** The page says so
to the customer, in plain words.

**The schema uses the product's own vocabulary**, from `CONTEXT_for_posterity.md`: accounts move
through the six **phases**; only accounts shift phases and plans move with them; one plan = one
delivery **year**. Two choices worth knowing:

- **`account_phase_events` is append-only.** The phase history of a legacy has to be auditable
  forever.
- **`trigger_confirmations` stores *both* verification steps as columns** — so a trigger must be
  **proven**, never inferred.

**The backfill mattered:** there was already **one auth user with no account row** — someone who could
log in and had nothing to log in to. That is exactly the orphan the trigger now prevents. Fixed.

A test signup was created and deleted. **Current state: 1 auth user, 1 account, no test data.**

## ✅ Code — Posterity can now sign up a user

It could not, at any point before today.

### Added
- **`proxy.js`** — a real server-side auth gate. (Next 16 renamed `middleware` → `proxy`.) Refreshes
  the session, redirects signed-out visitors. **Verified: `GET /dashboard` signed out now returns 307
  before a byte of HTML is served.**
- **`lib/supabase/client.js`**, **`lib/supabase/server.js`** — cookie-based auth (`@supabase/ssr`).
- **`app/auth/callback/route.js`** — where the email-confirmation link lands.
- **`app/dashboard/LogoutButton.jsx`**.
- **`scripts/`** — `sb.sh` (run SQL against the live DB), `fetch-supabase-keys.sh`,
  `add-stripe-key.sh`, `stripe-prices.py`, `test-signup.py`, `install-hooks.sh`, `hooks/pre-commit`.

### Changed
- **`app/signup/page.js` — it signs people up now.** It *was a copy of the pricing page*: its function
  was literally named `Pricing()`, it quoted the **wrong prices**, and its buttons linked to itself.
  **No account could ever be created.** Replaced with a real form. Verified end to end: signup → auth
  user → account in **horizon** → phase event recorded.
- **`app/dashboard/page.js`** — a server component on **real data** (phase, content, recipients,
  trusted contacts, plans) instead of hardcoded zeros.
- **`app/login/page.js`**, **`app/components/GlobalNav.js`** — moved to the cookie-based client.
- **`package.json`** — added `@supabase/ssr`.

### Removed
- **The "✓ I'm Still Here" check-in button.** It was **wired to nothing** — no `onClick`, no handler.
  That is worse than no button: it tells a customer their check-in landed when it did not. Check-in
  only means something alongside the trigger it holds back, so **both halves ship together in Phase
  1.2, or neither does.**
- **`app/api/cursor-inbox/route.js`** — a route that wrote client-supplied data to disk. Its first
  line read *"LOCAL ONLY — never deploy this route"*, and it was committed, so it deployed. A route
  cannot be defended by a comment.
- **`lib/supabase.js`** — the old browser client. See below.

### Why the auth gate was fake — and it wasn't laziness
The old client kept the session in **`localStorage`, where the server can never see it.** A
server-side gate wasn't merely missing, it was **impossible**; the client-side `window.location`
redirect was the only thing that *could* have been written. Moving auth to cookies is what unblocked
it. There are now **three layers on purpose** — proxy redirects, the page re-checks server-side, RLS
sits under both — because Next's own docs are explicit that proxy is an *optimistic* check and "should
not be used as a full session management or authorization solution."

## 📄 Documents — `BUILD/`

Our documents live in `BUILD/`. **Everything outside it — `Project Documents/`,
`CONTEXT_for_posterity.md`, the PDFs — is Jeremy's, and we do not edit it.**

| File | What it is |
|---|---|
| `CHANGELOG.md` | This file. |
| `CODE_AUDIT.md` | What is *actually built*, verified line by line. |
| `BUILD_ORDER.md` | What to build, in order. Does **not** replace `Posterity_Build_Roadmap.md`. |
| `POSTERITY_SOCIAL.md` | The Posterity Social spec + its open questions. |
| **`META_DELIVERY.md`** | **Jeremy: this is the one to read.** |

**Rule 1, now enforced:** `scripts/hooks/pre-commit` **rejects** any commit touching `app/`, `lib/`,
`proxy.js`, `supabase/migrations/`, or `scripts/` that doesn't also update this changelog. A rule in
a markdown file is a request; a hook is a wall.

## Attribution
Every file we authored now carries **Walker Brown** — in the title of each `BUILD/` document, and in
the header of each file we created (`proxy.js`, `lib/supabase/*`, `app/auth/callback`,
`app/dashboard/LogoutButton.jsx`, both migrations, and all of `scripts/`).

**Jeremy's files are not signed and not touched.** Neither are the pages of his we rewrote rather than
created (`app/signup`, `app/login`, `app/dashboard`) — those stay his, with our changes in the git
history where they belong. Build re-verified after the change.

## ⚠️ A correction we made mid-session: Meta is NOT being replaced

Earlier today our documents said the Meta/Instagram integration was **dead**, replaced by Posterity
Social. **That was false.** It was inferred from a secondhand summary and written into project memory
as a settled decision — even though it flatly contradicted Jeremy's own context document, which is
precisely the moment it should have been raised with him as a question instead.

**Jeremy confirmed:** Facebook and Instagram **remain** the delivery platforms, published via
**Buffer** (direct API "gonna be an option" later). **Posterity Social is an additional layer, not a
substitute.** His "Social Media Integration" section **stands**.

**No code was affected** — the repo never contained a single line of Meta integration, so nothing was
removed and nothing needs restoring. The error lived only in `BUILD/` and `CLAUDE.md`, and all of it
is corrected.

It is recorded here rather than quietly edited away. A project whose documents already run years ahead
of its code cannot also have documents that silently rewrite themselves.

---

# 🔴 Findings — decisions only Jeremy can make

*We found these, did not act on them, and cannot decide them.*

## 1. The site displays one price and charges another

| Plan | The page shows | Stripe actually charges | |
|---|---|---|---|
| Horizon | $9.99/yr | $9.99 **recurring/year** | ✅ |
| Basic | $99 | **$39, one-time** | ❌ |
| Premium | $249 | **$99, one-time** | ❌ |
| Legacy | $899 | **$299, one-time** | ❌ |

$39 / $99 / $299 are **exactly the numbers on the stale `/signup` page** — so that page wasn't just a
leftover, it was **the truth about what Stripe was set up to charge.** Someone buying Legacy sees
**$899** and is billed **$299**. Every plan but Horizon is also a **one-time** price, so the annual
plans **never renew** — including the $9.99 storage fee that pays to hold content for decades.

*Likely mercy:* those are **test-mode** price IDs. If production runs a live key they don't resolve
there at all, so checkout would **error rather than undercharge**. Unconfirmed — we don't have the
live key and don't want it.

**Your own doc says the fix is easy:** *"any re-pricing post-review is a Stripe Price ID swap, not a
code rebuild."* Agreed — and `lib/plans.js` (queued) is what makes that true.

## 2. The checkout cannot be fixed by adding a webhook

`app/api/create-checkout-session/route.js` sends Stripe **no user identity** — no
`client_reference_id`, no `customer_email`, no `metadata`. A `checkout.session.completed` event would
arrive carrying **nothing that identifies who paid.** So "there's no webhook" **understates it**: even
a perfect webhook would have nothing to attach the money to. **Fix the checkout first.**

It also takes the **price ID from the client**, unvalidated, and **requires no auth**.

> **Until this is fixed: if checkout is live anywhere public, turn it off.** It takes money and
> records nothing.

## 3. Meta delivery — the one failure his fallback chain can't absorb
**Full note: `META_DELIVERY.md`.**

**Credit first:** the four-layer chain — Buffer → Meta Business API → direct platform login (stored
password + Posterity-controlled 2FA) → manual override — is well built, and it **answers the
token-expiry problem** we raised. Staff who can log in can re-authorize Buffer indefinitely. The
register's verdict that the Meta API is *"an inconvenience, not a risk"* **is correct for the risk it
names.**

**The gap:** every layer depends on the same single thing — **being able to log in.** One event
removes it permanently, for all four at once: **memorialization.** A memorialized account **cannot be
logged into by anyone** — not with the password, not with the 2FA, not by Meta support. The stored
credentials go inert. **Any person can trigger it** with an obituary link. **The word "memorial"
appears nowhere in the project documents.**

And it isn't a footnote: the people most likely to report a death to Facebook are **close family** —
**exactly the recipients Posterity delivers to** — and a man's posts appearing on his wall months after
his funeral is the single most likely thing to prompt that report. **The more effective the product
is, the more likely it ends itself.**

**Not "drop Meta."** It's that **Meta cannot be the channel Posterity *guarantees*.** The context doc
already concedes the principle — *"failure to provide credentials… will not cancel service"* — so the
ask is small:
1. **Every content item carries a recipient email or phone.** A **schema decision, cheap right now**,
   expensive once there's content in the database.
2. **Detect memorialization** and treat it as terminal for that channel (a memorialized profile is
   publicly marked *"Remembering"*).
3. **One line in the contract:** *"If a platform becomes unavailable, your message is delivered by
   email or text instead."*

## 4. A check-in false positive is extinction-level
A living customer's goodbye messages sent to their family. Unrecoverable. **Design the safeguards
before the feature** — and build the check-in and the trigger together, never one alone.

## 5. Consumer health data has teeth
Once Posterity Social stores *"user X has Stage 4 pancreatic cancer"*: HIPAA likely doesn't apply, but
**Washington's My Health My Data Act** does — and it carries a **private right of action**, meaning
individuals can sue directly. Worth a lawyer's hour before launch; far cheaper to design for than to
retrofit.

---

# Pending

- **Stripe — deliberately untouched**, because Jeremy is repricing. Then: `lib/plans.js` as the single
  source of truth, a **server-side** plan→price map (the browser should never name a price),
  `mode: 'subscription'`, auth on the route, and the webhook. **~1 hour once the numbers land.**
- **Needed from Jeremy:**
  1. **The sub-tag pool card** — the Posterity Social spec cut off mid-sentence at *"Communication &
     Relationships."*
  2. **A call on the Meta fallback** (Finding 3) — not *whether* to use Meta, that's settled, but
     whether the contract will say plainly that an unavailable platform falls back to email or text.
- **Phase 1:** content creation · the check-in/trigger system · **email-first** delivery · a real
  dashboard.
