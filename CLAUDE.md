@AGENTS.md

# 🔴 RULE 1 — UPDATE `BUILD/CHANGELOG.md`. EVERY TIME. NO EXCEPTIONS.

**If you changed anything in this repo or in the database, you update `BUILD/CHANGELOG.md` before
you stop. This is not a nice-to-have and it is not optional.**

**Why it is a hard rule, and not a habit:** we work on the `walker/build` branch and **we never push
to Jeremy's repo.** He will never see a commit, a diff, or a pull request. GitHub will never tell
him anything happened. **`BUILD/CHANGELOG.md` is the only record he gets that his own project
changed.** If it is not in that file, from his point of view it did not happen — and he is the owner
of this product.

It matters most for the database. Code sits on a branch and can be thrown away with a `git reset`.
**The migrations are live on his Supabase the moment they run.** Always mark database changes
separately from code changes, so he never has to squint to see which ones are already real.

**This is enforced.** A pre-commit hook rejects any commit that touches `app/`, `lib/`, `proxy.js`,
or `supabase/migrations/` without also touching `BUILD/CHANGELOG.md`. If you find yourself reaching
for `--no-verify`, you are about to do the exact thing this rule exists to prevent. Don't.
*(Install the hook in a fresh clone with `bash scripts/install-hooks.sh`.)*

---

## Project memory — read this first

**The gap between the documents and the code is the most important fact about this project.**
Posterity has a 108KB context doc, a collaboration system, a PDF pipeline, and a Priority System
with a mathematical foundation — and as of 2026-07-13 the entire application was **1,040 lines**,
could not sign up a user, and had a completely empty database. Do not let the volume of planning
documents imply the product exists. **Check the code. Check the database.**

**Roles:** Jeremy Grego is the founder/owner. Walker is the builder and has Jeremy's full
permission, including on Jeremy's Supabase. Claude.ai remains the planning/decision layer for
product decisions; Claude Code executes.

## Git — read before you commit

- **`main` is Jeremy's. It matches `origin/main` exactly and is never committed to.**
- All of our work is on the **`walker/build`** branch.
- **Pushing to Jeremy's repo is disabled at the git level** (push URL = `NO_PUSH_JEREMYS_REPO`), so
  a stray `git push` fails loudly instead of quietly changing his repo. Undo only with his
  agreement: `git remote set-url --push origin git@github.com:jerthrwicked/posterity.git`
- **Our documents live in `BUILD/`. Everything outside it — `Project Documents/`,
  `CONTEXT_for_posterity.md`, the PDFs — is Jeremy's and we do not edit it.**

## Our documents (`BUILD/`)

- **`BUILD/CHANGELOG.md`** — ⚠️ **update this at the end of every session, before you stop.** We
  never push to Jeremy's repo, so this file — not GitHub — is the only record he gets of what
  changed. Flag database changes separately from code changes: the DB ones are live on his project
  and are not undone by a `git reset`.
- **`BUILD/CODE_AUDIT.md`** — what is actually built, verified line by line. Read before believing
  any roadmap.
- **`BUILD/BUILD_ORDER.md`** — what to build, in order. Does not replace Jeremy's roadmap.
- **`BUILD/POSTERITY_SOCIAL.md`** — the social pivot spec + six open questions.

**Phase 0 (make it real):** 0.1 schema ✅ **DONE** · 0.2 a signup that signs people up · 0.3
server-side auth gate · 0.4 **fix the checkout, *then* the webhook — in that order.**

🔴 **The checkout is worse than "there's no webhook."** `app/api/create-checkout-session/route.js`
sends Stripe **no user identity at all** — no `client_reference_id`, no `customer_email`, no
`metadata` — so even a perfect webhook would have nothing to attach the money to. It also takes the
**price ID from the client** (unvalidated), runs in **`mode: 'payment'`** so annual plans never
renew, and **has no auth**. Fix the checkout first.

🔴 **The check-in button has no `onClick`** (`app/dashboard/page.js:73`). The most safety-critical
control in the product does nothing. The trigger doesn't exist either — **the system is "safe" only
because none of it works.** Build both halves together or neither.

## The two live risks

1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to
   their family. Design the safeguards *before* the feature.
2. **Consumer health data.** Posterity Social stores "user X has Stage 4 pancreatic cancer."
   HIPAA likely doesn't apply, but Washington's **My Health My Data Act** does — and it carries a
   **private right of action**. Needs a lawyer before launch.

*(The old Meta/ToS risk is **dead** — see below.)*

## Posterity Social — the pivot (2026-07-13)

Meta/Instagram integration is **replaced** by **Posterity Social**: a walled, in-app social network
for the elderly and those facing mortality, unlocked by the Horizon fee. Nothing shares outside
Posterity, ever. Discovery runs on a **Focus** (the medical/life context — the trunk) plus generic
**tags** that the Focus disambiguates ("Shaking" under Parkinson's ≠ under anxiety).

This kills three things at once: the ToS/legality risk, a **security bomb** (the old design stored
every customer's Facebook password and pointed their 2FA at Posterity-controlled contacts), and a
manual labor model (staff logging in to post as deceased customers).

**🔴 The blocking question: who receives a delivery?** With Meta gone, does a legacy reach a
recipient who is *not* a Posterity member — the customer's 34-year-old daughter? "Nothing shares
outside Posterity" read literally says no. Email/SMS delivery says yes. **These are different
products and the `recipients`/`deliveries` schema needs the answer.** See `BUILD/POSTERITY_SOCIAL.md`.

**Phase 0 is untouched by the pivot** — signup, auth, checkout, and webhook are not delivery.

## Database

Supabase project **`vypytfmutmeyfwmkapjg`** (Jeremy's account — Walker's Supabase MCP CANNOT see it).
Reach it with `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads the token from
`.env.local`, gitignored). Free tier — pauses after ~7 days idle; the first query wakes it.

Schema: 14 tables, RLS on all, in `supabase/migrations/20260713000000_initial_schema.sql`. It uses
the product's own vocabulary — accounts move through six **phases** (horizon → planning → abeyance →
active → twilight → posterity); **only accounts shift phases, plans move with them**; one plan = one
delivery **year**. The trigger system is deliberately auditable: `trigger_confirmations` stores
**both** verification steps as columns, so a trigger must be *proven*, never inferred.
`account_phase_events` is append-only. **Clinical language is banned product-wide** — keep it out of
code and comments too.

**Missing to run the app:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`.
Get from Jeremy/Vercel. (The `SUPABASE_ACCESS_TOKEN` in `.env.local` is a **Management API** token —
it reaches the database via `sb.sh`, but it cannot run the app.)
