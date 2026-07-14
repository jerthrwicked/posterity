@AGENTS.md

## Project memory — read this first

**The gap between the documents and the code is the most important fact about this project.**
Posterity has a 108KB context doc, a collaboration system, a PDF pipeline, and a Priority System
with a mathematical foundation — and as of 2026-07-13 it had built almost nothing: no signup
(`app/signup/page.js` was a duplicate of the pricing page), no Stripe webhook (checkout took money
and recorded nothing), and a **completely empty database** — zero tables, no migration ever run.
Do not let the volume of planning documents imply the product exists. Check the code and the DB.

**Roles:** Jeremy Grego is the founder/owner. Walker is the builder and has Jeremy's full
permission, including on Jeremy's Supabase. Claude.ai remains the planning/decision layer for
product decisions; Claude Code executes.

**Working build order:** `Project Documents/WORKING_BUILD_ORDER.md` — grounded in the code, and
does NOT replace Jeremy's `Posterity_Build_Roadmap.md`.
- Phase 0 (make it real): **0.1 database schema ✅ DONE 2026-07-13** · 0.2 a signup that signs
  people up · 0.3 server-side auth gate (the current one is a client-side `window.location`
  redirect, which is not protection) · 0.4 **the Stripe webhook** — the most dangerous gap in the repo.
- Phase 1 (the core loop): content creation · the check-in / trusted-contact trigger system ·
  delivery (EMAIL FIRST) · a dashboard worth the name.

**Two risks bigger than any build task:**
1. The product promises it "posts content on behalf of customers to their chosen delivery
   platforms." Meta ToS broadly forbids operating an account you don't own or posting as a
   deceased person. **This may not be legally buildable** — research it before building toward it.
2. A check-in false positive would send a living customer's goodbye messages to their family.
   Design the safeguards before the feature.

## Database
Supabase project **`vypytfmutmeyfwmkapjg`** (Jeremy's account — Walker's Supabase MCP CANNOT see it).
Reach it with: `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads the token
from `.env.local`, gitignored). Free tier — it pauses after ~7 days idle; the first query wakes it.

Schema: 14 tables, RLS on all of them, in `supabase/migrations/20260713000000_initial_schema.sql`.
It uses the product's own vocabulary — accounts move through six **phases** (horizon → planning →
abeyance → active → twilight → posterity); **only accounts shift phases, plans move with them**;
one plan = one delivery **year**. The trigger system is deliberately auditable:
`trigger_confirmations` stores **both** verification steps as columns, so a trigger must be
*proven*, never inferred. `account_phase_events` is append-only. Clinical language is banned
product-wide — keep it out of code and comments too.
