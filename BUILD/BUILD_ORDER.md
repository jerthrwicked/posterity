# Posterity — Working Build Order · Walker Brown
**Authored 2026-07-13 by Walker + Claude (OptiServer), from a read of the actual codebase.
Revised 2026-07-13 for the Posterity Social pivot.**

**Status:** a *working* build order for hands-on-keyboard sessions. It does **not** replace
`Project Documents/Posterity_Build_Roadmap.md` (Jeremy's, via Claude.ai) — that stays the canonical
product roadmap. This one is grounded in what the code can and cannot currently do, and exists
because the two disagree about what is blocking what. Reconciling them is a conversation for Jeremy.

Findings referenced below are detailed in **`CODE_AUDIT.md`**. The social pivot is in
**`POSTERITY_SOCIAL.md`**.

---

## THE STATE OF THE CODE (verified, not remembered)

The whole application is **1,040 lines**. It cannot sign up a user.

| Thing | Reality |
|---|---|
| Landing / pricing pages | ✅ exist |
| **Database schema** | ✅ **DONE 2026-07-13** — 14 tables, RLS on all. Was completely empty before. |
| **Signup** | ❌ `app/signup/page.js` is a **copy of the pricing page**, quoting **the wrong prices**, whose buttons link to itself. No account can be created. |
| Login | ✅ real — but nobody can sign up, so nobody can log in |
| Dashboard | ⚠️ 79 lines of hardcoded zeros |
| **Stripe checkout** | 🔴 sends Stripe **no user identity** · takes the **price from the client** · runs in **one-time payment mode** for annual plans · **has no auth** |
| **Stripe webhook** | ❌ does not exist |
| Auth gate | ❌ does not exist — no `middleware.js`, no `proxy.js` |
| Check-in button | 🔴 **has no `onClick`** |
| Content / recipients / delivery | ❌ none of the actual product exists |

---

## PHASE 0 — MAKE IT REAL
*Nothing can be sold, used, or tested until these exist. Everything in every roadmap is downstream.
**Unaffected by the Posterity Social pivot** — none of this is delivery.*

**0.1 — Database schema.** ✅ **DONE.** `supabase/migrations/20260713000000_initial_schema.sql`.
14 tables, RLS on all, 6 enums, using the product's own vocabulary (the six phases; only accounts
shift phases; one plan = one delivery year). `trigger_confirmations` stores **both** verification
steps as columns, so a trigger must be *proven*, never inferred. `account_phase_events` is
append-only.

**0.2 — A signup that signs people up.** Replace the duplicate-pricing-page at `/signup` with a real
form: `supabase.auth.signUp` → create the `accounts` row in **horizon** phase. Delete the stale price
table with it (FINDING 2) — the wrong prices are currently sitting at the primary conversion point.

**0.3 — Server-side auth gate.** A `proxy.js` (Next 16 renamed `middleware` → `proxy`) that gates
authed routes server-side. The current client-side `window.location` redirect is not protection.

**0.4 — Fix the checkout, *then* write the webhook.** In that order — and the order is the point.
The checkout currently sends Stripe **nothing that identifies the buyer**, so even a perfect webhook
would have nothing to attach the money to (FINDING 1).
   - **0.4a — Checkout:** attach `client_reference_id` / `metadata.account_id`. Move to a
     **server-side plan → price map** (the client sends a plan id, never a price id). Switch to
     `mode: 'subscription'` — every plan is annual and today **nothing renews**. Require auth.
   - **0.4b — Webhook:** `checkout.session.completed` → write the subscription and the plan, move the
     account phase, record to `stripe_events`. Verify signatures with `STRIPE_WEBHOOK_SECRET`; write
     with `SUPABASE_SERVICE_ROLE_KEY`.

**0.5 — Delete `app/api/cursor-inbox/route.js`** (FINDING 5), or gate it behind an env var. A route
that writes client-supplied data to disk should not be protected by a comment saying "never deploy
this route."

✅ *Phase 0 done = a person can create an account, pay, and have it stick.*

> **Until 0.4 ships: if the Stripe checkout is live anywhere public, turn it off.** It takes money
> and records nothing.

---

## PHASE 1 — THE CORE LOOP
*The actual product promise. None of it exists today.*

**1.1 — Content creation.** Write a message, attach media, choose a recipient, choose the date. This
IS the product; everything else is packaging.

**1.2 — Trusted contact + the non-response trigger.** 🔴 **The highest-risk logic in the entire app.**
A false positive sends a living customer's goodbye messages to their family. That failure is
unrecoverable and would end the company.
   - Design the failure modes **first**: the six-notification escalation, the trusted contact's
     double verification, and a **hard human-in-the-loop hold before anything sends**.
   - **Build both halves together.** Today the check-in button does nothing *and* the trigger doesn't
     exist — the system is "safe" only because none of it works. That stops being true the moment
     either half ships alone.

**1.3 — Delivery engine — EMAIL FIRST.** Channels are social (Facebook/Instagram via Buffer), email,
and SMS, chosen per piece — as the context document always said. **Build email first anyway**, and
not as a shortcut: Meta delivery can be killed by a token expiry or by a memorialization request from
a relative, neither of which Posterity controls (see LIVE RISKS). **Email is the channel that always
works, so it is the one the promise rests on.** Social is layered on top once it does.

**1.4 — A dashboard worth the name.** Content, recipients, check-in status, the plan. It currently
shows an email address and three zeros.

✅ *Phase 1 done = the product does the thing the website promises.*

---

## PHASE 2 — POSTERITY SOCIAL
*The retention pillar — an **additional** layer, not a replacement for Meta delivery. A second schema
on the same `accounts` spine. Full spec and open questions: **`POSTERITY_SOCIAL.md`**.*

**2.1 — The Focus list.** Curate the ~50–100 conditions people actually join over, plus *Aging* and
*Legacy/Posterity*. Hand-attach the correct staging scheme per condition — **there is no generic
`stage` field in any medical vocabulary** (Q3). Confirm SNOMED/ICD licensing first.

**2.2 — The tag pool + search.** The Focus is the trunk; general tags rank within it. The Focus is
the coordinate system, not a ranking term. *(Blocked: the sub-tag card was cut off in transmission —
get it from Jeremy.)*

**2.3 — Profiles, posts, the feed.** Walled: no external links, no external sharing, no field that
would accept one.

**2.4 — Friends and messaging.** 🔴 **Mutual-consent only.** No unsolicited DMs. Report and block
ship **day one**, not v2. Rate-limit search, profile views, and friend requests. Search by Focus and
stage is a targeting database for elder fraud unless it is built defensively (Q2).

**2.5 — Death inside the network.** What a member's friends see when that member dies. There is no
acceptable default (Q4). Design it deliberately.

---

## PHASE 3 — OPERATIONS, LEGAL, LAUNCH
- Admin: view accounts, verify/trigger activation, intervene on disputes
- Notifications (customer + admin); the Priority System work
- **Legal, and some of it moves earlier:** consumer health data (Washington's My Health My Data Act
  carries a **private right of action**) — see Q5. ToS, privacy policy, the delivery contract.
- Visual design pass, the PDF/document work

---

## LIVE RISKS

**🔴 Check-in false positives.** See 1.2. The highest-risk logic in the app.

**🔴 Meta delivery — one failure mode his fallback chain cannot absorb.** Full note:
**`META_DELIVERY.md`**. Meta stays; Jeremy's four-layer chain (Buffer → API → direct login → manual
override) is well built and **does** answer the token-expiry problem. But all four layers depend on
being able to **log in**, and **memorialization** — which any relative can trigger, which locks the
account against all posting forever, and which appears **nowhere in his documents** — removes that
permanently. The recipients Posterity delivers to are the people most likely to report the death, so
the product's success is what triggers it.

   **Not "drop Meta."** It is: **Meta cannot be the channel Posterity guarantees.** Email/SMS is the
   spine; Meta is the bonus channel. That is exactly why **1.3 builds email first**, and why every
   content item must carry a recipient email/phone — a **schema decision that is cheap now** and
   expensive once there is content in the database.

**🟠 Consumer health data** once Posterity Social stores a diagnosis — Washington's My Health My Data
Act carries a private right of action. See Phase 3.

> **Correction, 2026-07-13:** an earlier version of this file said the Meta integration was dead and
> replaced by Posterity Social. **That was wrong** — it was inferred from a secondhand summary and
> written down as fact despite contradicting Jeremy's own context document. Posterity Social is
> **additive**. No code was affected; the error lived only in our documents.

---

## WHAT WE ARE DELIBERATELY NOT DOING FIRST

The canonical roadmap gates *all* building behind a pre-build work order: PDF cover corrections
(96px hero text), PDF design rules, a bridge-documentation PDF, a creative alignment pass, and legal
research — plus three prerequisite brainstorm sessions for a Priority System with a mathematical
foundation document and a master weight table.

None of that is worthless. All of it is downstream of an app that can sign up a user. **The
documents are not the prerequisite to the build; right now they are standing in for it.**
