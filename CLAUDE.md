@AGENTS.md

# Posterity — CLAUDE.md

One file for every Claude Code session on this project, whoever is running it. Jeremy Grego is the founder. Walker Brown is the co-founder and builder. Both run Claude Code against this repository; Jeremy approves each change once, before its commit.

Jeremy works across several Claude.ai chats within the Posterity project, and the Project Instructions Doc owns their names and roles under THE CHATS. Its ID is 1e2hjCL4d3Fie5_0WAlZLHc4b1M7ly9j3zcU9QoF3Brg. Any of them may hand this repository work, and authored edits still run under Section 6. A session reads THE CHATS through its export link under Section 1 when its work needs the roles.

Combined September 15, 2026 from Walker's July file and the September briefing.

---

## 1. The record — read this before doing anything

The build record is one Google Doc, **Posterity Build Roadmap** (ID 1efUJ8Qha9Pg0nN5qVW__kup1xpfZvCg2QMs7DhG568I), in Jeremy's Posterity folder in Drive. Its Build Roadmap tab holds every remaining build item in suggested build order, and its Build Log tab holds everything already built, newest first, in one table. Nothing is ever removed from the Build Log. It is the only copy of either, and every session, Jeremy's and Walker's alike, records build progress there. Start with its *How This Document Is Edited* and *Current Status* sections.

`Posterity_Build_Roadmap.md` and `Posterity_Build_Log.md` at the repository root hold only a note pointing to that Doc. Their earlier contents, the record until October 26, 2026, stay in the repository's history.

Every other project document is likewise a Google Doc in Jeremy's Google Drive, which holds its definitive version, and this repository keeps no copy of it. That covers the Master Specification, its design records (Social Media Integration, the Delivery System, and Posterity Social), the Founder Build Roadmap, and the Build Queue. They are Google Docs, never Claude Docs, so Claude Code does not use the Claude Docs connector for them.

The **Master Specification** governs what gets built. Each stage names the subjects to read within it. A session reads a Google Doc when its work needs one or when asked, and never by default at opening. It reads the Doc through the Google Drive connector first, whose markdown download carries every tab, and otherwise pulls the Doc's markdown through the Doc's export link into `live-docs/`, a folder git ignores. The ID comes from any link to the Doc, whether in the Master Specification's Important Links, this repository, or the prompt. The Master Specification's own ID is 14OoN3GlzDnJjo0ll6hIN6pjU7nCEsWB2MA39R-jWhPY. Each pull overwrites the last, so the copy matches its Doc on the day it is pulled. A session searches that copy for a stage's subjects before building against them. If a download comes back as a web page rather than markdown, stop and ask Jeremy. He can save the Doc through File, then Download, then Markdown into the same folder.

```bash
mkdir -p live-docs
curl -sL "https://docs.google.com/document/d/<ID>/export?format=md" -o live-docs/<Doc_Name>.md
```

**Session opening:** pull `main` and read the roadmap Doc's *How This Document Is Edited* and *Current Status*.

## 2. What Claude Code may do on its own

**Build progress is the whole of the standing permission.** Work only on build items whose status reads *designed*, where nothing above them in the hierarchy carries another status. The roadmap's Current Status says which stages are open.

When a build item is finished and its code has reached `main`, in the same pass: remove it from its stage in the roadmap Doc and add a row to the top of the Doc's Build Log table, naming the commit that built it. Neither part is ever updated without the other. The Build Log records build items only, never document edits.

Change nothing else within the roadmap Doc without approval from Jeremy or Walker. Never edit the Master Specification or any file within `live-docs/`.

**Print every change back rather than summarizing it, then stop.** A truncated or misplaced write surfaces while the work that produced it is still open.

**For build progress, do not commit without approval, including after a correction.** Print every change, then ask Jeremy once, before the commit. That approval also covers the push, the pull request, and the merge into `main`, which follow without asking again. A change to the live database keeps an approval of its own under Section 3. Authored edits follow their own route, set out in Section 6.

**Sessions run in Auto mode.** Ask rules still stop for the commit and for database changes, and Auto mode's reviewer handles everything else. If a commit, push, or merge is refused, stop and report it rather than retrying in another form.

**Never route around a permission.** Build no scratch copy of a repository tool, and no other workaround, that sidesteps an ask rule. Ask instead.

Never place an API key, token, or password within the repository, the roadmap, the Build Log, or any document, since the repository is public. On the PC, keys live in the gitignored `.env.local`, and the site's keys live in Worker secrets. While Posterity is in build and test, Claude may see and use any key the work needs, and every key is rotated before launch. The scripts echo names and lengths only.

## 3. The database — changes here are live the moment they run

Supabase project `vypytfmutmeyfwmkapjg`, Jeremy's account. Reach it with `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads a Management API token from `.env.local`). `sb.sh` encodes each query with Node. Inline queries are read-only. Every change to the database runs from a file with `-f`. Each migration is first dry-run in a transaction that rolls back, with a check that nothing remains, before it is applied. Free tier: it pauses after about seven days idle. A paused project is resumed with the Resume button in the Supabase dashboard, since Supabase does not say whether a query wakes it.

A migration on `main` is not a migration applied — they run only when someone executes them against the project. **Every migration is tested against the live database as a real signed-in user** (`scripts/test-*.py`, or `scripts/test-*.mjs` where Python isn't installed) so row-level security is actually exercised. "A second customer sees zero of the first one's legacy" is proven, not assumed.

In the Build Log, mark a database change as a database change, separately from code. Code on a branch is undone by a reset; a migration is undone only by another migration.

RLS is on every table. These migrations are all applied and live:

1. `20260713000000_initial_schema` — the first migration this project ever had
2. `20260713120000_account_on_signup` — the account row is created by a trigger in the same transaction as the user
3. `20260713140000_fallback_and_legacy` — a recipient must have an email or a phone (since 21, an email); every account gets its primary legacy at signup
4. `20260713160000_trusted_contacts` — same reachability rule (since 21, an email; since 23, an email and a phone); promoting a primary is one database transaction (`set_primary_trusted_contact`, SECURITY INVOKER so RLS applies). Since 27 the table is `legacy_guards` and the function `set_primary_legacy_guard`
5. `20260713180000_media_storage` — the private `legacy-media` bucket; 25 MB ceiling and formats enforced by the bucket; objects keyed to the account by path
6. `20260716120000_trigger_staff_death_verification` — `staff_verified` and `vetoed` paths on `trigger_confirmations`; never read, and removed by 16
7. `20260918120000_trial_and_storage_state` — `accounts.trial_ends_at` and `accounts.storage_paid_through`, the first storage gate
8. `20260918123000_storage_paid_through_whole_day` — a paid-through date holds until that day has ended everywhere (UTC-12)
9. `20260925000000_communication_dispatch` — the Communication Dispatch System's storage: five server-only tables (`dispatch_copy`, `dispatch_messages`, `text_agreements`, `dispatch_inbound`, and the append-only `dispatch_events`), RLS on with no policies and client grants revoked. `dispatch_events` has no foreign keys, so it survives account deletion.
10. `20261007000000_dispatch_email_frame` — `dispatch_copy` rows gain a kind; the one `frame` row wraps every email
11. `20261007010000_dispatch_copy_dash` — restores the em dash in the seeded text-agreement placeholder
12. `20261026000000_account_status` — Stage 4.1: the phases renamed to Interlude and Reprise; the lapse, building, and social rules in `account_status()`; `guard_account_columns` keeps phase and storage out of the customer's hands
13. `20261026010000_account_guard` — the customer cannot delete their own account row, and a file in the media bucket cannot be replaced while building is locked
14. `20261026020000_legacy_and_plan_guard` — the customer cannot delete or demote the primary legacy (one per account, by index), and plans are read-only to the customer: every plan column is set by payment. The guards read the request's token, so anything that writes plans for the customer runs with the service role.
15. `20261026030000_legacy_default_not_primary` — a new legacy is not the primary unless it says so
16. `20261027010000_drop_staff_verification` — removes the staff verification and veto columns migration 6 added, with their check and index; neither the Master Specification nor the roadmap holds a staff check
17. `20261027020000_account_names_and_phone` — the account's `legal_name`, `name` (what recipients see; the legal name unless signup gave one), and `phone` (E.164), written by `handle_new_user` from signup's metadata and editable by the customer
18. `20261028010000_account_details` — the legal name and name are required (a blank name becomes the legal name; each needs a letter or number and runs 200 characters at most), and `phone_confirmed_at`, set by Posterity only, clears whenever the number changes; `tidy_account_details` runs after `guard_account_columns`
19. `20261030000000_legacy_guard_setup_lock` — Legacy Guard setup (adding, editing, promoting, removing a Legacy Guard) locks at Interlude: open in Horizon and Planning only, by phase, so a storage lapse leaves it open. The trigger refuses the customer's token with a reason and lets the service role through, so automatic invitation resends must run with the service role, and so must anything that deletes an account
20. `20261030010000_legacy_guard_setup_in_account_status` — `account_status()` gains `legacy_guard_setup_open` (the same Horizon-and-Planning rule), and `legacy_guard_setup_is_open()`, which the trigger calls, now reads that field, so the Legacy Guards page and the lock read one answer. The function was dropped and recreated to add the column; its privileges came back unchanged
21. `20261030020000_contact_email_required` — a Saved Recipient and a Legacy Guard each need an email address, as the Master Specification defines them; a phone number stays optional for both (Walker, October 31), until 23 required it for a Legacy Guard. The two reachability constraints keep their names. Applied October 31, 2026
22. `20261030030000_include_in_posterity_off_by_default` — `content_items.include_in_posterity` defaults to false, as the specification's Include in Posterity toggle is off by default. Applied October 31, 2026
23. `20261031010000_legacy_guard_phone_required` — a Legacy Guard needs a phone number as well as an email address, as the specification's "Adding one takes a label, an email address … and a phone number" (Walker, October 31). A Saved Recipient's phone stays optional. `trusted_contacts_reachable` keeps its name (`legacy_guards_reachable` since 27)
24. `20261031020000_contact_phone_e164` — `recipients_phone_e164` and `trusted_contacts_phone_e164` (`legacy_guards_phone_e164` since 27) hold a phone number as E.164, as `accounts_phone_e164` does, since the Communication Dispatch System sends to nothing else. The Saved Recipient and Legacy Guard forms convert what the customer types with `lib/posterity/phone.js`
25. `20261101010000_dispatch_report_dedupe` — a unique index on `dispatch_events` (provider message, event type, `report_id`) makes a provider's resent report a no-op. It covers events after #538: the twelve test-run report rows before it, three of them duplicated, stay outside it. Applied November 1, 2026
26. `20261101020000_dispatch_claim_skips_test_scripts` — `dispatch_claim` takes an optional caller. Without one (the scheduler) it skips every message whose caller starts with `test-`; with one (a test script) it claims only that caller's messages. A test script's caller must start with `test-`. Applied November 1, 2026
27. `20261101030000_legacy_guards_rename` — the schema says Legacy Guard (Walker, November 1): `trusted_contacts` is `legacy_guards`, with its constraints and indexes; `trusted_contact_id` is `legacy_guard_id` on `trigger_confirmations` and `dispatch_messages`; the trigger source `trusted_contact` is `legacy_guard`; `set_primary_trusted_contact(p_contact_id)` is `set_primary_legacy_guard(p_guard_id)`. The page moved to `/dashboard/legacy-guards`. Migrations before it keep the old names as history

The one object in the live database that no migration creates is the function `rls_auto_enable`, which the event trigger `ensure_rls` runs at the end of every DDL command. Leave both alone until a migration records them.

Two constraints to understand before touching them: `recipients_reachable_without_meta` and `legacy_guards_reachable`. A Facebook account can be memorialized by any relative, which locks it against posting forever. A recipient reachable only through Facebook is a message with nowhere to go; an unreachable Legacy Guard means the escalation has nowhere to go at all. Since migration 21 each requires an email address, and since 23 a Legacy Guard requires a phone number too. Since 24 every phone number held is E.164.

Vocabulary the schema uses: accounts move through phases; only accounts shift phases, plans move with them; one plan is one delivery year. `trigger_confirmations` stores both verification steps as columns so a trigger is proven, never inferred. `account_phase_events` is append-only. Say *account* for phase progression and *plan* for delivery configuration. Clinical mortality language stays out of anything customer-facing, including copy in code. Anything a customer sees follows the specification's Brand Copy, reproduced exactly, and its Website Design Standards. Customer-facing text without approved copy follows the roadmap's placeholder convention. The schema says Legacy Guard, as the specification does (`legacy_guards`, named `trusted_contacts` until migration 27).

## 4. Where the build stands (verified against the code, the live database, and the Worker, October 30, 2026)

**Hosting:** www.yourposterity.com is the Cloudflare Worker `posterity` (`wrangler.jsonc`, entry `worker.js`), cut over from Vercel on October 11, 2026; the bare domain redirects to www through a Cloudflare redirect rule. `BUILD/CLOUDFLARE_MIGRATION.md` holds the move. Vercel was deleted on November 1, 2026, so a bad deploy is undone by rolling the Worker back to an earlier version.

**Building and deploying:** build only with `bash scripts/cf-build.sh`. OpenNext copies every `.env*` file into the Worker bundle, so the script hides `.env.local` for the build and passes the public `NEXT_PUBLIC_*` values only. Since November 1, 2026, Cloudflare's Workers Builds deploys every merge into `main`: it runs `NEXT_PUBLIC_SITE_URL=https://www.yourposterity.com bash scripts/cf-build.sh`, with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build variables, and then `npx wrangler deploy`. A push to any other branch runs the same build and then `npx wrangler deploy --dry-run`, which checks that the Worker bundles without uploading anything, and the result shows on its pull request. A pull request merges only once that build passes. No session deploys by hand, since a hand deploy from a branch puts work that has not merged onto the live site until the next merge replaces it. The hand deploy, `NEXT_PUBLIC_SITE_URL=https://www.yourposterity.com bash scripts/cf-build.sh && npx wrangler deploy` from Git Bash, is only the fallback when Workers Builds fails. Server values are Worker secrets, set with `wrangler secret put` or in the Cloudflare dashboard and never in the build: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `POSTMARK_SERVER_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `DISPATCH_RUN_SECRET`. The Worker also holds copies of `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_SITE_URL` as secrets. `STRIPE_WEBHOOK_SECRET` is not set.

**Live:** signup with the legal name, the name recipients see, and a phone number; a three-layer auth gate (`proxy.js` — Next 16's renamed middleware — plus `requireAccount()` on every private page, plus RLS; `/dashboard` signed out returns 307 before any HTML); the account status check, `account_status()`, which every surface reads for the phase, storage standing, building, Posterity Social, and Legacy Guard setup; building locked by a storage lapse; Settings for the account's details; recipients; messages with a delivery date; video and photo upload into the private bucket with one-hour signed URLs; Legacy Guards with one primary, locked at Interlude; plan cards priced from `lib/posterity/plans.js`.

**Checkout:** signed-in user required; the client sends a plan choice and the price is resolved server-side from `lib/posterity/plans.js` — the single catalog of plan → tier → price → price ID → billing mode, so display and charge cannot drift. **Test mode only**: live Stripe products wait on the business formation. `scripts/test-checkout.mjs` runs every tier's checkout in a real browser against a local server.

**Webhook, dormant:** `app/api/webhooks/stripe/route.js` is signature-verified, writes with the service-role key, and is idempotent through `stripe_events` (an event already processed is skipped). A storage subscription extends `storage_paid_through`; a one-time plan payment is recorded and moves a Horizon account to Planning. It wakes when `STRIPE_WEBHOOK_SECRET` is set as a Worker secret and the endpoint is registered in Stripe. Which plan year a payment funds waits for the cart (Stage 4.3).

**Communication Dispatch System, built and not sending:** its storage, policy, senders, and scheduler are built (`lib/dispatch/`). The Worker's cron calls `POST /api/dispatch/run` every minute with `DISPATCH_RUN_SECRET`, and nothing in the product queues a message yet. Postmark delivers only to `@yourposterity.com` until the account is approved, and Twilio texting waits on carrier registration.

**Not built:** the check-in and the trigger; the delivery engine; the cart; the Legacy Guard portal and invitations; media compression and thumbnails; account deletion (deleting a user does not delete their storage files).

**Infrastructure, set up by hand September 15 (Jeremy):** domain at Cloudflare; every address at the domain forwards to `posterity.admin@gmail.com` (`admin@yourposterity.com` since September 15, every other address since November 1, 2026), and none can send; Postmark on the Developer tier, verified for the domain; Twilio pay as you go with a New Orleans number, voicemail via two TwiML Bins.

**Jeremy's PC:** Windows 11. Python isn't installed, so new scripts are written in Node. The GitHub command-line tool is signed in, so pull requests open and merge from the terminal. `.claude/settings.json`, committed so cloud sessions read it too, asks before `git commit` and `bash scripts/sb.sh -f`, lets the push, the pull request, and the merge after an approved commit run without asking, asks before deleting a remote branch, and blocks force pushes. Local build sessions run in the desktop app's Code tab on this folder, with no terminal, and every new session connects to Remote Control so Claude.ai can follow it. `ANTHROPIC_API_KEY` stays unset: when it is set, Claude Code bills Console credits and loses the claude.ai connectors, Remote Control, and Chrome.

## 5. The risks that shape the design

1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to their family. The check-in and the trigger are designed before they are written and ship together or not at all. The old "✓ I'm Still Here" button was deleted because it was wired to nothing; a control that lies is worse than one that is absent.
2. **Meta cannot be the channel Posterity guarantees.** Social delivery publishes to a Facebook Page the customer owns, through Posterity's own app and a system user, with no login anywhere in the chain, so memorialization of the customer's profile does not stop it. Buffer is retired and Instagram is deferred. The Social Gate still gives every social delivery a route off Meta, and email and text remain the spine, which is why delivery is built email first. Detail: the Social Media Integration design record, which supersedes `BUILD/META_DELIVERY.md`.
3. **Consumer health data.** Posterity Social stores a customer's medical context. HIPAA likely does not apply; Washington's My Health My Data Act does, with a private right of action. Needs a lawyer before launch. Detail: `BUILD/POSTERITY_SOCIAL.md`.

When Walker's notes or this file contradict Jeremy's documents, ask Jeremy. Do not record the contradiction as a decision — that mistake was made once (Meta was written up as dead; it is not) and is why this sentence is here.

## 6. Git

- `origin` is `https://github.com/jerthrwicked/posterity.git` on Jeremy's PC. `main` holds the code and is protected on GitHub: changes reach it only through a pull request, force pushes and deleting it are refused, and a merged branch deletes itself. The record is the roadmap Doc (Section 1).
- Walker's work happens on `walker/` branches, merged to `main` on approval. Pull `--rebase` before every commit.
- Authored edits to this file run on a short branch cut from `main`, with a printback, one approval, and a pull request merged at once. The roadmap Doc is edited directly, as its *How This Document Is Edited* section sets out. Build progress follows the rules above.
- `scripts/hooks/pre-commit` (installed by `bash scripts/install-hooks.sh`) prints a reminder on any commit touching `app/`, `lib/`, `proxy.js`, `supabase/migrations/`, or `scripts/`: once it reaches `main`, the change goes in the roadmap Doc's Build Log. A hook cannot see the Doc, so it reminds rather than blocks.

## 7. Files Walker authored

`BUILD/CHANGELOG.md` was the record from July 13 until the Build Log took over; its entries are carried across into the Build Log and it is no longer updated. `BUILD/README.md` describes the July git setup, and Section 6 supersedes it. `BUILD/CODE_AUDIT.md` is the July 13 read of the codebase. `BUILD/BUILD_ORDER.md` is superseded by the roadmap. `BUILD/META_DELIVERY.md` is superseded by the Social Media Integration design record, and `BUILD/POSTERITY_SOCIAL.md` is the design note behind risk 3. `BUILD/CLOUDFLARE_MIGRATION.md` is the October 11 move from Vercel to the Cloudflare Worker. `scripts/sb.sh`, `scripts/test-*.py` and `scripts/test-*.mjs`, `scripts/stripe-*.py` are the database and Stripe tools. `lib/posterity/plans.js` and `lib/posterity/account.js` are the catalog and the auth helper. `lib/dispatch/` is the Communication Dispatch System: the queue, the channel policy, the senders, and the scheduled run.
