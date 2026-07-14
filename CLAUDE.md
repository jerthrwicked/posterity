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

**The gap between the documents and the code was the most important fact about this project.**
Posterity has a 108KB context doc, a collaboration system, a PDF pipeline, and a Priority System
with a mathematical foundation — and on the morning of 2026-07-13 the entire application was
**1,040 lines**, could not sign up a user, and had a **completely empty database**. Do not let the
volume of planning documents imply the product exists. **Check the code. Check the database.**

**Roles:** Jeremy Grego is the founder/owner. Walker is the builder and has Jeremy's full
permission, including on Jeremy's Supabase. Claude.ai remains the planning/decision layer for
product decisions; Claude Code executes.

## Where the build actually is (end of 2026-07-13)

**Phase 0 — done except Stripe.** Real signup (the account *and* the primary legacy are created by a
database trigger, in the same transaction as the user — they cannot be skipped). Real server-side
auth gate: `proxy.js` + a re-check on every private page + RLS, three layers. `/dashboard` signed out
**307s before a byte of HTML is served**.

**Phase 1.1 — done.** `/dashboard/recipients`, `/dashboard/legacy` (messages, video, photos),
`/dashboard/trusted-contacts`. Media sits in a **private** bucket, keyed to the account by its path,
played back through signed URLs that expire in an hour.

**Not built, on purpose:** the **check-in and the trigger** (Phase 1.2). A false positive sends a
living customer's goodbye messages to their family. **It gets designed before it gets written**, and
the check-in and the trigger ship **together or not at all** — a check-in button wired to nothing is
exactly what we deleted.

**Not built, blocked:** Stripe (Jeremy is repricing), the delivery engine, media compression,
thumbnails, account deletion.

**Every migration was tested against the live database as a real signed-in user, so RLS was actually
exercised** — see `scripts/test-*.py`. Keep doing that. A second customer must never see the first
one's legacy, and "it looks right" is not evidence.

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

✅ **The fake check-in button is gone.** It read "✓ I'm Still Here" and was wired to **nothing** — a
control that lies is worse than one that's absent. It comes back only alongside the trigger it holds
back (Phase 1.2).

## The live risks

1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to
   their family. Design the safeguards *before* the feature.
2. **Meta delivery has two failure modes Buffer does not remove** — see below.
3. **Consumer health data.** Posterity Social stores "user X has Stage 4 pancreatic cancer."
   HIPAA likely doesn't apply, but Washington's **My Health My Data Act** does — and it carries a
   **private right of action**. Needs a lawyer before launch.

## Delivery — Meta STAYS. Posterity Social is ADDITIVE.

> ⚠️ **A previous version of this file claimed Meta was dead and replaced by Posterity Social. That
> was WRONG.** It was inferred from a secondhand summary and written into project memory as fact,
> despite contradicting Jeremy's own context document. **Jeremy is the owner; when our notes
> contradict his documents, ask him — do not record the contradiction as a decision.** No code was
> affected; the error lived only in our documents.

**Delivery goes OUT** — Facebook and Instagram (published via **Buffer**, to avoid building against
the Meta API; direct API is an option later), plus email and SMS. **Posterity Social stays IN** — a
walled, in-app network for the living phases, unlocked by the Horizon fee, where nothing is shared
outward. Discovery runs on a **Focus** (the medical/life context — the trunk) plus generic **tags the
Focus disambiguates** ("Shaking" under Parkinson's ≠ under anxiety). The walled garden is a rule
about *Social*, not about delivery.

**🔴 Buffer is itself a Graph API client.** It changes who writes the API code; it does not change
what Meta permits or what expires. Two problems survive it:
- **A ~60-day token against a 30-year promise.** Meta's long-lived tokens need re-authorization from
  an active session. Over a 27-year account that's ~160 renewals, each needing a login to the
  customer's Facebook — including after they die.
- **Memorialization.** Any relative can report a death; Meta then **locks the account and nothing can
  post to it, ever.** Outside Posterity's control *and* the customer's.

**What follows is not "don't do it."** It is: **Meta cannot be the channel Posterity guarantees.**
Email/SMS is the spine that always works; Meta is the bonus channel that usually will. That is why
delivery is built **email first**. Full detail: `BUILD/POSTERITY_SOCIAL.md`.

**Phase 0 is untouched by any of this** — signup, auth, checkout, and webhook are not delivery.

## Database

Supabase project **`vypytfmutmeyfwmkapjg`** (Jeremy's account — Walker's Supabase MCP CANNOT see it).
Reach it with `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads the token from
`.env.local`, gitignored). Free tier — pauses after ~7 days idle; the first query wakes it.

Schema: 14 tables, RLS on all. **Four migrations**, all applied and live:
1. `20260713000000_initial_schema` — the first migration this project ever had
2. `20260713120000_account_on_signup` — the account, guaranteed by the database
3. `20260713140000_fallback_and_legacy` — **a recipient must have an email or a phone**, and every
   account gets its primary legacy at signup
4. `20260713160000_trusted_contacts` — reachability + one-primary, in one transaction
5. `20260713180000_media_storage` — the **private** `legacy-media` bucket

It uses the product's own vocabulary — accounts move through six **phases** (horizon → planning →
abeyance → active → twilight → posterity); **only accounts shift phases, plans move with them**; one
plan = one delivery **year**. The trigger system is deliberately auditable: `trigger_confirmations`
stores **both** verification steps as columns, so a trigger must be *proven*, never inferred.
`account_phase_events` is append-only. **Clinical language is banned product-wide** — keep it out of
code and comments too.

**Two constraints worth understanding before you touch them:**
- **`recipients_reachable_without_meta`** — a recipient must have an email or a phone. Meta can be
  lost to memorialization, which any relative can trigger and which locks the account against posting
  forever. A recipient reachable *only* through Facebook is a message with **nowhere to go**.
- **`trusted_contacts_reachable`** — same, higher stakes: an unreachable trusted contact means the
  six-notification escalation has nowhere to go at all.

**`.env.local` is complete** — all six values are in it (gitignored). Four came straight from the
Management API via `scripts/fetch-supabase-keys.sh`. Note the `SUPABASE_ACCESS_TOKEN` there is a
**Management API** token: it reaches the database via `sb.sh`, but it cannot run the app.

**Never print a secret.** The scripts write straight to `.env.local` and echo only names and lengths.
