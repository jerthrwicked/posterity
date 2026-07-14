# Posterity — Working Build Order
Authored 2026-07-13 by Walker + Claude (OptiServer), from a read of the actual codebase.

**Status of this document:** this is a *working* build order for hands-on-keyboard sessions.
It does not replace `Posterity_Build_Roadmap.md` (Jeremy's, via Claude.ai) — that stays the
canonical product roadmap. This one is grounded in what the code can and cannot currently do,
and exists because the two disagree about what is blocking what. Reconciling them is a
conversation for Jeremy.

---

## THE STATE OF THE CODE (verified, not remembered)
| Thing | Reality |
|---|---|
| Landing page | ✅ exists |
| Pricing page | ✅ exists |
| **Signup** | ❌ **`app/signup/page.js` is a duplicate of the pricing page** — its function is literally named `Pricing()`, and its buttons link to `/signup` (itself). **No account can be created.** |
| Login | ✅ real (`signInWithPassword`) — but nobody can sign up, so nobody can log in |
| Dashboard | ⚠️ 79 lines: shows your email + a logout button |
| Stripe checkout | ⚠️ creates a session… |
| **Stripe webhook** | ❌ **does not exist.** Nothing listens for `checkout.session.completed`. **Money can be taken and never recorded.** |
| **Database schema** | ❌ **none.** No tables, no `.sql`, nothing. |
| Auth protection | ⚠️ client-side `window.location` redirect only — not real protection |
| Content / check-in / delivery | ❌ none of the actual product exists |

**Summary: Posterity is a marketing site with a checkout button and no product behind it.**

---

## PHASE 0 — MAKE IT REAL
*Nothing can be sold, used, or tested until these four exist. Everything else in every roadmap
is downstream of this. Est: a few focused sessions.*

**0.1 — Database schema.** There isn't one. Everything hinges on it. Minimum viable tables:
profiles, subscriptions, content_items, recipients, trusted_contacts, checkins, delivery_queue,
delivery_log. Design once, deliberately, then migrate. This blocks literally every other item.

**0.2 — A signup that signs people up.** Replace the duplicate-pricing-page at `/signup` with a
real form: `supabase.auth.signUp` → create the profile row. Also collapse the duplication —
`/signup` and `/pricing` currently render the same thing.

**0.3 — Server-side auth gate.** The dashboard's client-side redirect is not protection; once
there is real data behind it, that's a leak. Middleware/proxy that gates authed routes.

**0.4 — Stripe webhook.** `checkout.session.completed` → write the subscription to the DB, grant
plan access. Without it, the checkout button is a hole in the floor: it takes money and records
nothing. **This is the single most dangerous gap in the repo.**

✅ *Phase 0 done = a person can create an account, pay, and have it stick.*

---

## PHASE 1 — THE CORE LOOP
*This is the actual product promise: "schedule messages to loved ones for after you're gone."
None of it exists today.*

**1.1 — Content creation.** Write a message, attach media, choose a recipient, choose the
delivery condition. This IS the product. Everything else is packaging.

**1.2 — Trusted contact + check-in system.** The "are you still alive?" mechanic — the thing that
decides when the product fires. **Treat this as the highest-risk logic in the entire app.** A
false positive means a living customer's goodbye messages get sent to their family. That failure
is unrecoverable and would end the company. Design the failure modes *first*: multiple check-in
misses, trusted-contact confirmation, a hard human-in-the-loop hold before anything sends.

**1.3 — Delivery engine — EMAIL FIRST.** Get delivery working to email before touching any social
platform. See the RISKS section below; the social-posting promise may not be legally buildable,
and the product must not depend on it to function.

**1.4 — A dashboard worth the name.** Show the content, the recipients, the check-in status, the
plan. Right now it shows an email address.

✅ *Phase 1 done = the product actually does the thing the website promises.*

---

## PHASE 2 — OPERATIONS & TRUST
- Admin: view accounts, verify/trigger activation, intervene on disputes
- Notifications (customer + admin)
- Financial ops / the Priority System work

## PHASE 3 — POLISH, LEGAL, LAUNCH
- Visual design pass, creative alignment, the PDF/document work
- Legal package (see risks — some of it needs to move *earlier*)

---

## RISKS THAT SHOULD BE RESOLVED BEFORE BUILDING TOWARD THEM

**🔴 The social-posting promise may not be legal.** The context says Posterity "posts content on
behalf of customers to their chosen delivery platforms after account activation." Meta/Instagram
ToS broadly prohibit sharing credentials, operating an account you don't own, and posting as a
deceased person — memorialization typically *locks* accounts. Buffer/Meta Business API access
requires app review, and "post on behalf of a dead user" is not an approved use case. **If this
is unbuildable, it changes the product's core promise — and the marketing copy.** Research this
NOW, before a single line is written toward it. It is currently buried inside Stage 4 as though
it were a routine integration.

**🔴 Check-in false positives are an extinction-level bug.** See 1.2. Design the safeguards
before the feature.

**🟠 Taking money with no webhook.** If the Stripe checkout is live anywhere public, turn it off
until 0.4 exists.

---

## WHAT WE ARE DELIBERATELY NOT DOING FIRST
The current roadmap gates *all* building behind a pre-build work order consisting of: PDF cover
corrections (96px hero text), PDF design rules, CLAUDE.md, a bridge-documentation PDF, a creative
alignment pass, and legal research — plus three prerequisite brainstorm sessions for a Priority
System with a mathematical foundation document and a master weight table.

None of that is worthless. All of it is downstream of an app that can sign up a user. The
documents are not the prerequisite to the build; they are, right now, standing in for it.
