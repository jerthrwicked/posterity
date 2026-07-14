# Posterity — Code Audit · Walker Brown
**Audited 2026-07-13 · Walker + Claude (OptiServer) · verified by reading every line of `app/` and `lib/`**

The entire application was **1,040 lines**: five pages, two API routes, one 6-line Supabase client.
Everything below was read, not remembered.

> ## Status, end of 2026-07-13
> **Findings 3, 4, 5 and 6 are FIXED.** Findings **1 and 2 are the Stripe ones and remain OPEN** —
> deliberately, because Jeremy is repricing. This document is kept as the record of what was found;
> the resolution is noted under each. Current state of the build: `BUILD_ORDER.md`.

---

## What exists

| | |
|---|---|
| Landing page (`app/page.js`) | ✅ 203 lines |
| Pricing page (`app/pricing/page.js` + `PlanCards.js`) | ✅ real, with live Stripe price IDs |
| Login (`app/login/page.js`) | ✅ real `signInWithPassword` — but nobody can sign up, so nobody can log in |
| Signup (`app/signup/page.js`) | ❌ **it is a copy of the pricing page** (see below) |
| Dashboard (`app/dashboard/page.js`) | ⚠️ 79 lines of hardcoded zeros |
| Stripe checkout (`app/api/create-checkout-session/route.js`) | ⚠️ 17 lines, and broken four ways (see below) |
| Stripe webhook | ❌ **does not exist** |
| Auth gate | ❌ **does not exist** — no `middleware.js`, no `proxy.js` |
| Database schema | ✅ **as of 2026-07-13** — 14 tables, RLS on all. Was empty before. |
| Content / recipients / check-ins / delivery | ❌ none of the actual product exists |

---

## FINDING 1 — The checkout cannot be fixed by adding a webhook 🔴 **OPEN**

`app/api/create-checkout-session/route.js` sends Stripe **no user identity whatsoever** — no
`client_reference_id`, no `customer_email`, no `metadata`. A `checkout.session.completed` event
would arrive carrying **nothing that identifies who paid**.

So the well-known gap ("there's no webhook") understates the problem. Even a perfect webhook would
have nothing to attach the money to. **The checkout must be fixed first, then the webhook.**

Three further defects in the same 17 lines:

- **The price comes from the client.** `const { priceId } = await req.json()` is handed straight to
  Stripe, unvalidated. Anyone can POST any price ID and receive a working checkout URL. Needs a
  server-side plan → price map; the client should send a *plan id*, never a price id.
- **`mode: 'payment'`, not `'subscription'`.** Every plan on the site is priced "/year", and the
  context document calls Horizon a *recurring annual subscription*. In payment mode **nothing ever
  renews** — the $9.99/yr storage fee, which is what pays to hold a person's content for decades,
  would be charged exactly once.
- **No auth on the route.** A logged-out stranger can open checkout sessions.

## FINDING 2 — The site quotes two different price lists 🔴 **OPEN**

| | Horizon | Basic | Premium | Legacy |
|---|---|---|---|---|
| `/pricing` (`PlanCards.js`) | $9.99 | $99 | $249 | $899 |
| `/signup` (the stale copy) | — | **$39** | **$99** | **$299** |

Both are live. `/signup` is the page **every "Get Started" button on the site points to** — so the
wrong prices sit at the primary conversion point. Worse, the buttons *on `/signup`* also link to
`/signup`. The main conversion path is a loop that quotes the wrong numbers.

The `/pricing` figures are the correct ones (they match the context document).

## FINDING 3 — The "I'm Still Here" button is not wired to anything ✅ **FIXED**

`app/dashboard/page.js:73`. The check-in control — **the single most safety-critical input in the
product** — is a `<button>` with no `onClick`. It renders, it hovers, it does nothing.

The mirror image is also true: the non-response trigger doesn't exist either, so nothing can
misfire. **The system is "safe" today only because none of it works.** That stops being true the
moment either half ships alone. Build both sides together, or neither.

> **Fixed — the button is gone.** A control that lies is worse than a control that's absent. The
> check-in ships alongside the trigger it holds back (Phase 1.2), or it does not ship.

## FINDING 4 — There is no auth gate ✅ **FIXED**

No `middleware.js`, no `proxy.js`. `/dashboard` is a client component that checks the session and
calls `window.location.href = '/login'` *after mounting*. The page and its markup are served to
anyone. It leaks nothing today because the dashboard is hardcoded zeros — it becomes a data leak
the day it shows real content.

> **Fixed — and the root cause was not laziness.** The old client kept the session in
> **`localStorage`, where the server can never see it**, so a server-side gate was *impossible*; the
> client-side redirect was the only thing that could have been written. Auth now runs on cookies
> (`@supabase/ssr`). `proxy.js` redirects, every private page re-checks server-side, and RLS sits
> under both. Verified: `GET /dashboard` signed out returns **307 before a byte of HTML is served**.

## FINDING 5 — A file-writing endpoint ships to production ✅ **FIXED**

`app/api/cursor-inbox/route.js` writes a client-supplied string to disk (`cursor-inbox.md`). Its
first line reads *"LOCAL ONLY — never deploy this route"* — **and it is committed to the repo, so
it deploys.** Its protection is header inspection (`origin`, `x-forwarded-for`, `x-real-ip`), which
is not a security boundary. On Vercel the filesystem is read-only so the write would fail anyway,
but a route should not be defended by a comment. **Delete it, or gate it behind an env var.**

> **Fixed — deleted.**

## FINDING 6 — `lib/supabase.js` throws at import if env is missing ✅ **FIXED**

The client is constructed at module scope. Missing env vars take down every page that imports it,
at import time, with an unhelpful error.

> **Fixed — the file is gone.** Replaced by `lib/supabase/client.js` and `lib/supabase/server.js`,
> which build the client inside a function rather than at import time.

---

## Required environment variables

Present in code: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_SITE_URL`.

Needed and **absent**: `SUPABASE_SERVICE_ROLE_KEY` (the webhook must write as admin, bypassing RLS)
and `STRIPE_WEBHOOK_SECRET` (to verify webhook signatures).

> **Resolved.** All six are now in `.env.local` (gitignored). Four were pulled straight from the
> Supabase Management API with `scripts/fetch-supabase-keys.sh` — never printed, written directly to
> the file. The Stripe **test** key came from Jeremy. `STRIPE_WEBHOOK_SECRET` is generated by the
> Stripe CLI when it forwards events, so nobody has to hand it over.

> Note: the `SUPABASE_ACCESS_TOKEN` already in `.env.local` is a **Management API** token. It talks
> to the *database* via `scripts/sb.sh`. It is not an application credential and cannot run the app.
