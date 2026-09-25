@AGENTS.md

# Posterity — CLAUDE.md

One file for every Claude Code session on this project, whoever is running it. Jeremy Grego is the founder. Walker Brown is the co-founder and builder. Both run Claude Code against this repository; Jeremy approves every push.

Combined September 15, 2026 from Walker's July file and the September briefing.

---

## 1. The record — read this before doing anything

Two markdown files at the repository root hold the build record and its authority. Each has a Google Doc as a readable copy, and those copies carry no authority.

- **`Posterity_Build_Roadmap.md`** — every remaining build item, in suggested build order. Start with its *How to Use This Document* and *Current Status* sections.
- **`Posterity_Build_Log.md`** — everything already built, by category, newest first within each. Nothing is ever removed from it.

Every other project document works the other way around. Its definitive version is the Google Doc in Jeremy's Google Drive, and any copy in this repository is an export that carries no authority. That covers the Master Specification, its design records (Social Media Integration, the Delivery System, and Posterity Social), the Founder Build Roadmap, and the Build Queue. Where an export and its Doc disagree, the Doc wins.

The **Master Specification** governs what gets built. Each stage names the subjects to read within it. `Posterity_Master_Specification.md` is a markdown export of it, and `Social_Media_Integration_System.md` is an export of the Social Media Integration System design record. Each export may lag behind its Doc. Search the export for a stage's subjects before building against them, and treat anything that looks out of date as a question for Jeremy. The Delivery System and Posterity Social design records have no export yet, so the person running the session pulls in the sections a stage needs from those Docs.

**Session opening:** pull `main` and read both files in full.

## 2. What Claude Code may do on its own

**Build progress is the whole of the standing permission.** Work only on build items whose status reads *designed*, where nothing above them in the hierarchy carries another status. The roadmap's Current Status says which stages are open.

When a build item is finished, in the same pass: remove it from its stage in the roadmap and add it to the matching category in the Build Log, newest first. Neither file is ever updated without the other. The Build Log records build items only, never document edits.

Change nothing else within either file without approval from Jeremy or Walker. Never edit the Master Specification or either export. A fresh export replaces its file whole, on Jeremy's approval.

**Print every change back rather than summarizing it, then stop.** A truncated or misplaced write surfaces while the work that produced it is still open.

**For build progress, do not commit or push without approval, including after a correction.** Jeremy approves pushes. Ask for commit, push, and merge separately — never bundle them. Authored edits follow their own route, set out in Section 6.

Never place an API key, token, or password within the repository, the roadmap, the Build Log, or any document. `.env.local` is gitignored and is the only place secrets live. Never print a secret; the scripts echo names and lengths only.

## 3. The database — changes here are live the moment they run

Supabase project `vypytfmutmeyfwmkapjg`, Jeremy's account. Reach it with `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads a Management API token from `.env.local`). Free tier: it pauses after about seven days idle and the first query wakes it.

A migration on `main` is not a migration applied — they run only when someone executes them against the project. **Every migration is tested against the live database as a real signed-in user** (`scripts/test-*.py`) so row-level security is actually exercised. "A second customer sees zero of the first one's legacy" is proven, not assumed.

In the Build Log, mark a database change as a database change, separately from code. Code on a branch is undone by a reset; a migration is undone only by another migration.

Schema: 14 tables, RLS on every one, 6 enums. Six migrations, all applied and live:

1. `20260713000000_initial_schema` — the first migration this project ever had
2. `20260713120000_account_on_signup` — the account row is created by a trigger in the same transaction as the user
3. `20260713140000_fallback_and_legacy` — a recipient must have an email or a phone; every account gets its primary legacy at signup
4. `20260713160000_trusted_contacts` — same reachability rule; promoting a primary is one database transaction (`set_primary_trusted_contact`, SECURITY INVOKER so RLS applies)
5. `20260713180000_media_storage` — the private `legacy-media` bucket; 25 MB ceiling and formats enforced by the bucket; objects keyed to the account by path
6. `20260716120000_trigger_staff_death_verification` — `staff_verified` and `vetoed` paths on `trigger_confirmations`, additive, nothing reads them yet

Two constraints to understand before touching them: `recipients_reachable_without_meta` and `trusted_contacts_reachable`. A Facebook account can be memorialized by any relative, which locks it against posting forever. A recipient reachable only through Facebook is a message with nowhere to go; an unreachable trusted contact means the escalation has nowhere to go at all.

Vocabulary the schema uses: accounts move through phases; only accounts shift phases, plans move with them; one plan is one delivery year. `trigger_confirmations` stores both verification steps as columns so a trigger is proven, never inferred. `account_phase_events` is append-only. Say *account* for phase progression and *plan* for delivery configuration. Clinical mortality language stays out of anything customer-facing, including copy in code. Anything a customer sees follows the specification's Brand Copy, reproduced exactly, and its Website Design Standards. Customer-facing text without approved copy follows the roadmap's placeholder convention. The schema's trusted contacts are the specification's Legacy Guards.

## 4. Where the build stands (verified against the code and the live site, September 15, 2026)

**Live at www.yourposterity.com:** signup; a three-layer auth gate (`proxy.js` — Next 16's renamed middleware — plus `requireAccount()` on every private page, plus RLS; `/dashboard` signed out returns 307 before any HTML); recipients, messages with a delivery date, video and photo upload into the private bucket with one-hour signed URLs, trusted contacts with one primary; plan cards at the confirmed ladder ($49 / $129 / $399, Horizon $9.99).

**Checkout:** signed-in user required; the client sends a plan choice and the price is resolved server-side from `lib/posterity/plans.js` — the single catalog of plan → tier → price → price ID → billing mode, so display and charge cannot drift; `mode:'subscription'` for Horizon, `mode:'payment'` for the one-time plans. Price IDs live in that file, not in environment variables. **Test mode only** — no live Stripe prices exist, and `.env.local` holds a test key. Checkout has not been run end to end in a browser.

**Webhook, dormant:** `app/api/webhooks/stripe/route.js` is signature-verified and writes to `subscriptions` with the service-role key. It wakes when `STRIPE_WEBHOOK_SECRET` is set and the endpoint is registered in Stripe. Its initiate logic needs review first — which plan year a payment funds and skipped-year storage are not derivable from one price, and the one-time insert is not idempotent on retries.

**Not built:** the check-in and the trigger; the delivery engine and the Communication Dispatch System; Grace Storage, the storage charge, additional recipient slots; media compression and thumbnails; account deletion (deleting a user does not delete their storage files).

**Still on the site from before the confirmed decisions:** the phase names Abeyance and Twilight on the homepage and the dashboard (confirmed names: Interlude and Reprise); plan bullets counting messages rather than Standard and Feature Deliveries; Grace Storage absent; Custom and Grace routed to a mail link. The Stage 3.1 Site Consistency Sweep lists these.

**Infrastructure, set up by hand September 15 (Jeremy):** domain at Cloudflare; site on Vercel at www.yourposterity.com with the apex redirecting; `admin@yourposterity.com` forwards in and cannot send; Postmark on the Developer tier, verified for the domain, unapproved so it delivers only to `@yourposterity.com`; Twilio pay as you go with a New Orleans number, voicemail via two TwiML Bins, messaging disabled until carrier registration. The site address variable, the Supabase auth redirects, and the Stripe return addresses still point at `posterity-seven.vercel.app`. API keys for Postmark and Twilio come from Jeremy directly when needed.

## 5. The risks that shape the design

1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to their family. The check-in and the trigger are designed before they are written and ship together or not at all. The old "✓ I'm Still Here" button was deleted because it was wired to nothing; a control that lies is worse than one that is absent.
2. **Meta cannot be the channel Posterity guarantees.** Social delivery publishes to a Facebook Page the customer owns, through Posterity's own app and a system user, with no login anywhere in the chain, so memorialization of the customer's profile does not stop it. Buffer is retired and Instagram is deferred. The Social Gate still gives every social delivery a route off Meta, and email and text remain the spine, which is why delivery is built email first. Detail: `Social_Media_Integration_System.md`, which supersedes `BUILD/META_DELIVERY.md`.
3. **Consumer health data.** Posterity Social stores a customer's medical context. HIPAA likely does not apply; Washington's My Health My Data Act does, with a private right of action. Needs a lawyer before launch. Detail: `BUILD/POSTERITY_SOCIAL.md`.

When Walker's notes or this file contradict Jeremy's documents, ask Jeremy. Do not record the contradiction as a decision — that mistake was made once (Meta was written up as dead; it is not) and is why this sentence is here.

## 6. Git

- `origin` is `git@github.com:jerthrwicked/posterity.git`. `main` is the record; only approved pushes reach it.
- Walker's work happens on `walker/build`, merged to `main` on approval. Pull `--rebase` before every commit.
- Authored edits to the roadmap, the Build Log, or this file, written in Claude.ai and handed over as a prompt, follow the roadmap's *How to Manually Edit This Document* route: a short branch cut from `main`, a printback, one approval, and a pull request merged at once. Build progress follows the rules above.
- `scripts/hooks/pre-commit` (installed by `bash scripts/install-hooks.sh`) rejects any commit touching `app/`, `lib/`, `proxy.js`, `supabase/migrations/`, or `scripts/` unless `Posterity_Build_Log.md` is also staged — the Build Log is the record, and a build change that is not in it did not happen from the founder's side.

## 7. Files Walker authored

`BUILD/CHANGELOG.md` was the record from July 13 until the Build Log took over; its entries are carried across into the Build Log and it is no longer updated. `BUILD/README.md` describes the July git setup, and Section 6 supersedes it. `BUILD/CODE_AUDIT.md` is the July 13 read of the codebase. `BUILD/BUILD_ORDER.md` is superseded by the roadmap. `BUILD/META_DELIVERY.md` is superseded by `Social_Media_Integration_System.md`, and `BUILD/POSTERITY_SOCIAL.md` is the design note behind risk 3. `scripts/sb.sh`, `scripts/test-*.py`, `scripts/stripe-*.py` are the database and Stripe tools. `lib/posterity/plans.js` and `lib/posterity/account.js` are the catalog and the auth helper.
