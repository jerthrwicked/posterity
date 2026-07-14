# Posterity — Changelog

Every change Walker + Claude have made, newest first.

**Read this first, Jeremy.** We work on the `walker/build` branch and **never push to your repo** —
so this file, not GitHub, is the record of what changed. Two kinds of change appear below and they
are not equally reversible:

- 🗄️ **DATABASE** — applied to your live Supabase (`vypytfmutmeyfwmkapjg`). **Real, and already in
  effect.** Undoing these takes a migration, not a `git reset`.
- 📄 **CODE / DOCS** — local only, on a branch. Nothing is deployed. Nothing reaches your repo
  unless you ask for it.

Anything under **Pending** has not been done.

---

## 2026-07-13

### Added — this changelog, and a hook that makes it mandatory
- **`BUILD/CHANGELOG.md`** (this file).
- **Rule 1 in `CLAUDE.md`**: update the changelog on every change, no exceptions.
- **`scripts/hooks/pre-commit`** — enforces it. Any commit touching `app/`, `lib/`, `proxy.js`,
  `supabase/migrations/`, or `scripts/` **is rejected** unless `BUILD/CHANGELOG.md` is updated too.
  A rule in a markdown file is a request; this is a wall. Install per clone with
  `bash scripts/install-hooks.sh`.

### 🗄️ Database — two migrations applied to the live project
The database **was completely empty**: zero tables, no migration history, nothing. It is not empty
now.

- **`20260713000000_initial_schema.sql`** — the first migration this project has ever had. **14
  tables, RLS on every one, 6 enums.** Built from `CONTEXT_for_posterity.md`, using the product's own
  vocabulary: accounts move through the six **phases**; only accounts shift phases and plans move
  with them; one plan = one delivery **year**. Two deliberate choices worth knowing:
  `account_phase_events` is **append-only** (the phase history of a legacy must be auditable
  forever), and `trigger_confirmations` stores **both** verification steps as columns — so a trigger
  must be *proven*, never inferred.
- **`20260713120000_account_on_signup.sql`** — a trigger on `auth.users` that creates the account row
  **in the same transaction as the user**, so it cannot be skipped by a dropped connection or a
  closed tab. Also **backfilled one orphaned user** who already existed in `auth.users` with no
  account — they could log in and had nothing to log in to.
- A test signup was created and deleted. Current state: **1 auth user, 1 account, no test data.**

### Added
- **`proxy.js`** — a real, server-side auth gate. (Next 16 renamed `middleware` → `proxy`.) It
  refreshes the Supabase session and redirects signed-out visitors. Next's own docs call proxy an
  *optimistic* check and say it "should not be used as a full session management or authorization
  solution" — so the dashboard **re-checks server-side**, with RLS underneath both. Three layers on
  purpose.
- **`lib/supabase/client.js`** and **`lib/supabase/server.js`** — cookie-based auth via
  `@supabase/ssr`.
- **`app/auth/callback/route.js`** — where the email-confirmation link lands.
- **`app/dashboard/LogoutButton.jsx`**.
- **`scripts/`** — `sb.sh` (run SQL against the live DB), `fetch-supabase-keys.sh`,
  `add-stripe-key.sh`, `stripe-prices.py`, `test-signup.py`.
- **`BUILD/`** — `README.md`, `CODE_AUDIT.md`, `BUILD_ORDER.md`, `POSTERITY_SOCIAL.md`, this file.
- Dependency: **`@supabase/ssr`**.

### Changed
- **`app/signup/page.js` — it now signs people up.** It was a **copy of the pricing page**: its
  function was literally named `Pricing()`, it quoted **the wrong prices**, and its buttons linked to
  itself. **No account could ever be created.** Replaced with a real form. Verified end to end:
  signup → auth user → account in **horizon** → phase event recorded.
- **`app/dashboard/page.js`** — now a server component reading **real data** (phase, content,
  recipients, trusted contacts, plans) instead of hardcoded zeros.
- **`app/login/page.js`**, **`app/components/GlobalNav.js`** — moved to the cookie-based client.
- **`CLAUDE.md`** — project memory, git rules, the live risks.

### Removed
- **The "✓ I'm Still Here" check-in button.** It was **wired to nothing** — no `onClick`, no handler.
  That is worse than no button: it tells a customer their check-in landed when it did not. Check-in
  only means something alongside the trigger it holds back, so **both halves ship together in Phase
  1.2, or neither does.**
- **`app/api/cursor-inbox/route.js`** — a route that wrote client-supplied data to disk. Its first
  line read *"LOCAL ONLY — never deploy this route"*, and it was committed to the repo, so it
  deployed. A route cannot be defended by a comment.
- **`lib/supabase.js`** — the old browser client. See below.

### Why the auth gate was fake, and it wasn't laziness
The old client kept the session in **`localStorage`, where the server can never see it.** A
server-side gate wasn't merely missing — it was **impossible**. The client-side
`window.location` redirect was the only thing that *could* have been written. Moving auth to cookies
is what unblocked it. `GET /dashboard` while signed out now returns **307 before a byte of HTML is
served** — tested, not assumed.

---

## 🔴 Findings for Jeremy — things we found, did not touch, and cannot decide

### The site displays one price and charges another
The price IDs hardcoded in `PlanCards.js` resolve to **the wrong amounts**:

| Plan | The page shows | Stripe actually charges | |
|---|---|---|---|
| Horizon | $9.99/yr | $9.99 **recurring/year** | ✅ |
| Basic | $99 | **$39, one-time** | ❌ |
| Premium | $249 | **$99, one-time** | ❌ |
| Legacy | $899 | **$299, one-time** | ❌ |

$39 / $99 / $299 are exactly the numbers on the stale `/signup` page — that page was not just a
leftover, it was **the truth about what Stripe was set up to charge.** Someone buying Legacy sees
$899 and is billed **$299**. Every plan but Horizon is also a **one-time** price, so the annual
plans **never renew**.

*(Likely mercy: those are **test-mode** IDs. If production runs a live key they don't resolve there
at all, so checkout would error rather than undercharge. Unconfirmed — we don't have the live key
and don't want it.)*

### The checkout cannot be fixed by adding a webhook
`app/api/create-checkout-session/route.js` sends Stripe **no user identity** — no
`client_reference_id`, no `customer_email`, no `metadata`. A `checkout.session.completed` event would
arrive with **nothing that identifies who paid.** The famous gap ("there's no webhook") understates
it: even a perfect webhook would have nothing to attach the money to. It also takes the **price ID
from the client**, unvalidated, and **requires no auth.**

### Two risks that outrank any build task
1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to
   their family. Unrecoverable. Design the safeguards *before* the feature.
2. **Consumer health data.** Posterity Social will store *"user X has Stage 4 pancreatic cancer."*
   HIPAA likely doesn't apply, but **Washington's My Health My Data Act** does — and it carries a
   **private right of action**, meaning individuals can sue directly. Worth a lawyer's hour before
   launch.

---

## Pending

- **Stripe — deliberately untouched.** Waiting on the new prices. Then: `lib/plans.js` as the single
  source of truth, a **server-side** plan→price map (the browser should never name a price),
  `mode: 'subscription'`, auth on the route, and the webhook. **Until that ships, if checkout is live
  anywhere public, turn it off** — it takes money and records nothing.
- **Needed from Jeremy:**
  1. **How does a legacy reach a recipient who is not a Posterity member?** With Meta gone, "nothing
     shares outside Posterity, ever" read literally means a customer's 34-year-old daughter can't
     receive her father's message. Email/SMS says she can. These are different products and the
     `recipients` / `deliveries` schema needs the answer. *(Detail: `POSTERITY_SOCIAL.md`, Q1.)*
  2. **The sub-tag pool card** — the Posterity Social spec cut off mid-sentence at "Communication &
     Relationships."
- **Phase 1:** content creation · the check-in/trigger system · **email-first** delivery · a real
  dashboard.
