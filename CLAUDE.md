@AGENTS.md

# Posterity — CLAUDE.md

One file for every Claude Code session on this project, whoever is running it. Jeremy Grego is the founder. Walker Brown is the co-founder and builder. Both run Claude Code against this repository; Jeremy approves every push.

Jeremy works across several Claude.ai chats within the Posterity project, and the Project Instructions Doc owns their names and roles under THE CHATS. Its ID is 1e2hjCL4d3Fie5_0WAlZLHc4b1M7ly9j3zcU9QoF3Brg. Any of them may hand this repository work, and authored edits still run under Section 6. A session reads THE CHATS through its export link under Section 1 when its work needs the roles.

Combined September 15, 2026 from Walker's July file and the September briefing.

---

## 1. The record — read this before doing anything

The build record is one Google Doc, **Posterity Build Roadmap (Draft) — October 26** (ID 1gwcdTcveNo7nlFlA473sATKKDHF_-vpfg4cUNICsDlc), kept in Drive beside Jeremy's Posterity Build Roadmap (Draft). It holds every remaining build item in suggested build order, then the Build Log: everything already built, newest first, in one table. Nothing is ever removed from the Build Log. Start with its *How This Document Is Edited* and *Current Status* sections. Walker builds to it as he sees fit; Jeremy agreed.

`Posterity_Build_Roadmap.md` and `Posterity_Build_Log.md` at the repository root are the record as it stood until October 26, 2026. They carry no authority now and are no longer updated.

Every other project document is likewise a Google Doc in Drive, and this repository keeps no copy of it. Its definitive version is the Google Doc in Jeremy's Google Drive, and this repository keeps no copy of it. That covers the Master Specification, its design records (Social Media Integration, the Delivery System, and Posterity Social), the Founder Build Roadmap, and the Build Queue.

The **Master Specification** governs what gets built. Each stage names the subjects to read within it. A session reads a Google Doc when its work needs one or when asked, and never by default at opening. It pulls the Doc's markdown through the Doc's export link into `live-docs/`, a folder git ignores. The ID comes from any link to the Doc, whether in the Master Specification's Important Links, this repository, or the prompt. The Master Specification's own ID is 14OoN3GlzDnJjo0ll6hIN6pjU7nCEsWB2MA39R-jWhPY. Each pull overwrites the last, so the copy matches its Doc on the day it is pulled. A session searches that copy for a stage's subjects before building against them. If a download comes back as a web page rather than markdown, stop and ask Jeremy. He can save the Doc through File, then Download, then Markdown into the same folder.

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

**For build progress, do not commit or push without approval, including after a correction.** Jeremy approves pushes. Ask for commit, push, and merge separately — never bundle them. Authored edits follow their own route, set out in Section 6.

**Git steps run in Manual mode.** Auto mode's checker blocks a retried commit after a refusal, and it blocks merging a pull request no human approved. If a commit, push, or merge is refused, stop and report it rather than retrying in another form.

**Never route around a permission.** Build no scratch copy of a repository tool, and no other workaround, that sidesteps an ask rule. Ask instead.

Never place an API key, token, or password within the repository, the roadmap, the Build Log, or any document. `.env.local` is gitignored and is the only place secrets live. Never print a secret; the scripts echo names and lengths only.

## 3. The database — changes here are live the moment they run

Supabase project `vypytfmutmeyfwmkapjg`, Jeremy's account. Reach it with `bash scripts/sb.sh "<sql>"` or `bash scripts/sb.sh -f file.sql` (reads a Management API token from `.env.local`). `sb.sh` encodes each query with Node. Inline queries are read-only. Every change to the database runs from a file with `-f`. Each migration is first dry-run in a transaction that rolls back, with a check that nothing remains, before it is applied. Free tier: it pauses after about seven days idle and the first query wakes it.

A migration on `main` is not a migration applied — they run only when someone executes them against the project. **Every migration is tested against the live database as a real signed-in user** (`scripts/test-*.py`, or `scripts/test-*.mjs` where Python isn't installed) so row-level security is actually exercised. "A second customer sees zero of the first one's legacy" is proven, not assumed.

In the Build Log, mark a database change as a database change, separately from code. Code on a branch is undone by a reset; a migration is undone only by another migration.

RLS is on every table. These migrations are all applied and live:

1. `20260713000000_initial_schema` — the first migration this project ever had
2. `20260713120000_account_on_signup` — the account row is created by a trigger in the same transaction as the user
3. `20260713140000_fallback_and_legacy` — a recipient must have an email or a phone; every account gets its primary legacy at signup
4. `20260713160000_trusted_contacts` — same reachability rule; promoting a primary is one database transaction (`set_primary_trusted_contact`, SECURITY INVOKER so RLS applies)
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

The one object in the live database that no migration creates is the function `rls_auto_enable`. Leave it alone until a migration records it.

Two constraints to understand before touching them: `recipients_reachable_without_meta` and `trusted_contacts_reachable`. A Facebook account can be memorialized by any relative, which locks it against posting forever. A recipient reachable only through Facebook is a message with nowhere to go; an unreachable trusted contact means the escalation has nowhere to go at all.

Vocabulary the schema uses: accounts move through phases; only accounts shift phases, plans move with them; one plan is one delivery year. `trigger_confirmations` stores both verification steps as columns so a trigger is proven, never inferred. `account_phase_events` is append-only. Say *account* for phase progression and *plan* for delivery configuration. Clinical mortality language stays out of anything customer-facing, including copy in code. Anything a customer sees follows the specification's Brand Copy, reproduced exactly, and its Website Design Standards. Customer-facing text without approved copy follows the roadmap's placeholder convention. The schema's trusted contacts are the specification's Legacy Guards.

## 4. Where the build stands (verified against the code and the live site, September 15, 2026)

**Live at www.yourposterity.com:** signup; a three-layer auth gate (`proxy.js` — Next 16's renamed middleware — plus `requireAccount()` on every private page, plus RLS; `/dashboard` signed out returns 307 before any HTML); recipients, messages with a delivery date, video and photo upload into the private bucket with one-hour signed URLs, trusted contacts with one primary; plan cards at the confirmed ladder ($49 / $129 / $399, Horizon $9.99).

**Checkout:** signed-in user required; the client sends a plan choice and the price is resolved server-side from `lib/posterity/plans.js` — the single catalog of plan → tier → price → price ID → billing mode, so display and charge cannot drift; `mode:'subscription'` for Horizon, `mode:'payment'` for the one-time plans. Price IDs live in that file, not in environment variables. **Test mode only** — no live Stripe prices exist, and `.env.local` holds a test key. Checkout has not been run end to end in a browser.

**Webhook, dormant:** `app/api/webhooks/stripe/route.js` is signature-verified and writes to `subscriptions` with the service-role key. It wakes when `STRIPE_WEBHOOK_SECRET` is set and the endpoint is registered in Stripe. Its initiate logic needs review first — which plan year a payment funds and skipped-year storage are not derivable from one price, and the one-time insert is not idempotent on retries.

**Not built:** the check-in and the trigger; the delivery engine; the Communication Dispatch System beyond its storage, which migration 9 applied on September 25, 2026; Grace Storage, the storage charge, additional recipient slots; media compression and thumbnails; account deletion (deleting a user does not delete their storage files).

**Still on the site from before the confirmed decisions:** plan bullets counting messages rather than Standard and Feature Deliveries; Grace Storage absent; Custom and Grace routed to a mail link. The Stage 3.1 Site Consistency Sweep lists these.

**Infrastructure, set up by hand September 15 (Jeremy):** domain at Cloudflare; site on Vercel at www.yourposterity.com with the apex redirecting; `admin@yourposterity.com` forwards in and cannot send; Postmark on the Developer tier, verified for the domain, unapproved so it delivers only to `@yourposterity.com`; Twilio pay as you go with a New Orleans number, voicemail via two TwiML Bins, messaging disabled until carrier registration. The site address variable, the Supabase auth redirects, and the Stripe return addresses still point at `posterity-seven.vercel.app`. API keys for Postmark and Twilio come from Jeremy directly when needed.

**Jeremy's PC:** Windows 11. Python isn't installed, so new scripts are written in Node. The GitHub command-line tool isn't signed in, so when a pull request can't be opened from the terminal, stop and say so, and it is opened and merged on the GitHub website. `.claude/settings.local.json` asks before `git commit`, `git push`, `git merge`, `gh pr`, and `bash scripts/sb.sh -f`. Local build sessions start with `claude --remote-control` so Claude.ai can follow them.

## 5. The risks that shape the design

1. **A check-in false positive is extinction-level** — a living customer's goodbye messages sent to their family. The check-in and the trigger are designed before they are written and ship together or not at all. The old "✓ I'm Still Here" button was deleted because it was wired to nothing; a control that lies is worse than one that is absent.
2. **Meta cannot be the channel Posterity guarantees.** Social delivery publishes to a Facebook Page the customer owns, through Posterity's own app and a system user, with no login anywhere in the chain, so memorialization of the customer's profile does not stop it. Buffer is retired and Instagram is deferred. The Social Gate still gives every social delivery a route off Meta, and email and text remain the spine, which is why delivery is built email first. Detail: the Social Media Integration design record, which supersedes `BUILD/META_DELIVERY.md`.
3. **Consumer health data.** Posterity Social stores a customer's medical context. HIPAA likely does not apply; Washington's My Health My Data Act does, with a private right of action. Needs a lawyer before launch. Detail: `BUILD/POSTERITY_SOCIAL.md`.

When Walker's notes or this file contradict Jeremy's documents, ask Jeremy. Do not record the contradiction as a decision — that mistake was made once (Meta was written up as dead; it is not) and is why this sentence is here.

## 6. Git

- `origin` is `git@github.com:jerthrwicked/posterity.git`. `main` holds the code; only approved pushes reach it. The record is the roadmap Doc (Section 1).
- Walker's work happens on `walker/build`, merged to `main` on approval. Pull `--rebase` before every commit.
- Authored edits to the roadmap, the Build Log, or this file, written in Claude.ai and handed over as a prompt, follow the roadmap's *How to Manually Edit This Document* route: a short branch cut from `main`, a printback, one approval, and a pull request merged at once. Build progress follows the rules above.
- `scripts/hooks/pre-commit` (installed by `bash scripts/install-hooks.sh`) prints a reminder on any commit touching `app/`, `lib/`, `proxy.js`, `supabase/migrations/`, or `scripts/`: once it reaches `main`, the change goes in the roadmap Doc's Build Log. A hook cannot see the Doc, so it reminds rather than blocks.

## 7. Files Walker authored

`BUILD/CHANGELOG.md` was the record from July 13 until the Build Log took over; its entries are carried across into the Build Log and it is no longer updated. `BUILD/README.md` describes the July git setup, and Section 6 supersedes it. `BUILD/CODE_AUDIT.md` is the July 13 read of the codebase. `BUILD/BUILD_ORDER.md` is superseded by the roadmap. `BUILD/META_DELIVERY.md` is superseded by the Social Media Integration design record, and `BUILD/POSTERITY_SOCIAL.md` is the design note behind risk 3. `scripts/sb.sh`, `scripts/test-*.py` and `scripts/test-*.mjs`, `scripts/stripe-*.py` are the database and Stripe tools. `lib/posterity/plans.js` and `lib/posterity/account.js` are the catalog and the auth helper.
