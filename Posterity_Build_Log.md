# Posterity — Build Log

Link: [Posterity Build Roadmap](https://docs.google.com/document/d/1mjcZUXLESWFxI6pwSvW5U82AA6bmhKhyB2DDkzq-bWo/edit?usp=sharing)

This file is the record of everything built for Posterity. Claude Code writes an entry here when a task closes out and removes it from Posterity_Build_Roadmap.md in the same pass, so neither file is updated without the other. Nothing is ever removed from this log.

Entries are organized by category, with the newest first within each. A category groups work by what it belongs to rather than by when it happened, so a single category can span months.

Entries predating September 12, 2026 were written under stage numbering that has since been retired. A stage number appearing within an older entry does not correspond to the current roadmap.

---

## Hosting Migration

Stage 3.5. The site moved from Vercel to Cloudflare on October 11, 2026, and www.yourposterity.com is served by the Cloudflare Worker. The plan and the way back are in BUILD/CLOUDFLARE_MIGRATION.md.

| Item | Date Completed |
| :-- | :-- |
| The Stripe client sends its requests through fetch. Its default, Node's http module, never answers on Workers, so a signed-in checkout on the new host hung until Cloudflare cancelled it with an error. The Stripe webhook uses the same client. Retested in the Workers runtime: a signed-in checkout returns its Stripe address | October 11, 2026 |
| The site runs on Cloudflare at www.yourposterity.com, deployed by hand with wrangler. The bare domain redirects to www through a Cloudflare redirect rule that keeps the path and query string, as Vercel did. Both Vercel DNS records are removed, and the mail records are unchanged. Checked live: the public pages load, an unknown page returns 404, the dashboard redirects a signed-out visitor to login, and checkout refuses a signed-out visitor. A signed-in session and a test checkout on the new host remain untested | October 11, 2026 |
| The server secrets and the site address live on Cloudflare as Worker secrets. The site address is https://www.yourposterity.com, so checkout's Stripe return addresses point at the live domain. scripts/cf-build.sh lets a site address given on the command line win over the local one, so the production build needs no edit to .env.local | October 11, 2026 |
| Supabase's site address and allowed auth redirects point at https://www.yourposterity.com, with localhost kept for local development. The site address had been http://localhost:3000, so signup confirmation emails linked to localhost | October 11, 2026 |
| The site builds for Cloudflare Workers through scripts/cf-build.sh, which keeps every server secret out of the Worker. The adapter copies every .env file into the Worker, and the first build carried the service-role key, the Stripe secret key and the Supabase management token inside it. The script builds with the public values only and fails if a secret reaches the bundle | October 10, 2026 |
| Tested locally in the Workers runtime: the public pages load, an unknown page returns 404, the dashboard redirects a signed-out visitor to login, checkout refuses a signed-out visitor, and the Stripe webhook rejects a bad signature and accepts a correctly signed event. A signed-in session and a real checkout remain untested | October 10, 2026 |
| The Stripe client is built on first use rather than when a route loads, since on Cloudflare the key is a runtime secret and a load-time client crashed the build | October 10, 2026 |
| The Stripe webhook verifies signatures asynchronously through Web Crypto, since Workers have no synchronous HMAC. The async form works on Vercel as well | October 10, 2026 |
| Next.js moved from 16.2.6 to 16.3.8, the smallest version the Cloudflare adapter accepts, with the adapter and Wrangler added and the Worker configured | October 10, 2026 |
| Paid Workers plan chosen for go-live (Walker) | October 10, 2026 |

---

## Domain and Email

| Item | Date Completed |
| :-- | :-- |
| DMARC record added through Cloudflare DMARC Management, with the policy set to monitoring only | September 15, 2026 |
| Email forwarding enabled through Cloudflare Email Routing — admin@yourposterity.com forwards to posterity.admin@gmail.com, tested, as the receiving side of the Posterity email account | September 15, 2026 |
| Domain yourposterity.com registered through Cloudflare, within a Posterity Cloudflare account under posterity.admin@gmail.com, separate from the founder's personal account | September 15, 2026 |

---

## Postmark

| Item | Date Completed |
| :-- | :-- |
| Domain yourposterity.com verified, with the DKIM and Return-Path records added through Cloudflare and both active | September 15, 2026 |
| Posterity server created as a Live server, sending through the default transactional stream | September 15, 2026 |
| Account created on the free Developer tier under admin@yourposterity.com, not yet approved, so delivery reaches only addresses on yourposterity.com | September 15, 2026 |

---

## Twilio

| Item | Date Completed |
| :-- | :-- |
| Incoming calls answered by a voicemail greeting and recorded within Twilio through two TwiML Bins, Posterity voicemail greeting and Posterity voicemail end, tested with a recorded message | September 15, 2026 |
| Local number 504-358-3544 purchased in New Orleans, with voice, SMS, and MMS capability, and messaging disabled until carrier registration | September 15, 2026 |
| Primary customer profile created for the founder as an individual | September 15, 2026 |
| Account created under admin@yourposterity.com and upgraded to pay as you go as an individual, with a $20 starting balance | September 15, 2026 |

---

## Claude Code Transition

| Item | Date Completed |
| :-- | :-- |
| Claude Code installed and authenticated on the Claude Max subscription, verified through /status rather than API credits | July 22, 2026 |
| CLAUDE.md authored and written to the project root | July 22, 2026 |
| settings.json configured — Plan Mode and Sonnet default, Opus available through /model | July 22, 2026 |

---

## Claude to Cursor Bridge

The bridge is retired. Claude Code replaced it, and these entries stand as history rather than as a description of anything currently running.

| Item | Date Completed |
| :-- | :-- |
| Priority Zero bridge documentation markdown created at Project Documents/Priority_Zero_Bridge_Documentation.md | June 13, 2026 |
| Bridge files cursor-inbox.md and cursor-outbox.md created in project root, added to .gitignore | June 12, 2026 |
| receive_task and post_result tools built and verified | June 12, 2026 |
| Local API route app/api/cursor-inbox/route.js built and verified, localhost only and never deployed | June 12, 2026 |
| Claude in Chrome bridge test verified — success response confirmed | June 12, 2026 |
| ask_posterity tool built and verified — Cursor Agent can call Claude through MCP with full project context | June 11, 2026 |

---

## MCP Servers

| Item | Date Completed |
| :-- | :-- |
| MCP server renamed from posterity to claude-cursor-bridge within index.mjs and mcp.json | June 12, 2026 |
| posterity-mcp server built — ask_posterity tool tested and confirmed working | June 11, 2026 |
| Google Docs MCP connected — context doc and session log doc live | June 9, 2026 |
| Filesystem MCP added to mcp.json | June 7, 2026 |
| Stripe MCP added to mcp.json | June 7, 2026 |
| GitHub MCP configured — 26 tools, personal access token, no expiration | May 27, 2026 |
| Supabase MCP configured — 29 tools, personal access token | May 27, 2026 |

---

## PDF Pipeline

| Item | Date Completed |
| :-- | :-- |
| Stylized PDF partial corrections complete — POSTERITY small caps top left, blue rule on cover, hero corrected to 52px | June 13, 2026 |
| Stylized PDF design spec locked — cover, typography, clearance rules, page numbers, sage and dusk rebrand | June 10, 2026 |
| Both commands added to package.json: generate-pdf and generate-stylized | June 4, 2026 |
| scripts/generate-stylized-pdf.js — styled investor PDF, manual only through npm run generate-stylized | June 4, 2026 |
| sync-context.js confirmed: calls generate-pdf.js only, never touches the stylized PDF | June 4, 2026 |
| Plain PDF output confirmed at 0.65MB | June 4, 2026 |
| PDF pipeline built using Puppeteer and markdown-it, replacing wkhtmltopdf and md-to-pdf | June 3, 2026 |
| scripts/generate-pdf.js — plain context PDF, called automatically by npm run sync | June 3, 2026 |

---

## Context Management

| Item | Date Completed |
| :-- | :-- |
| Anthropic Console account active — API credits for the MCP bridge, auto-reload enabled | June 11, 2026 |
| npm run sync appends session-notes.md to the Google Session Log, updates the Google Context Doc, and resets the session-notes.md template | June 9, 2026 |
| Claude in Chrome extension installed, connected, permissions set on all key sites | June 8, 2026 |
| cursor.com/dashboard accessible through Claude in Chrome | June 8, 2026 |
| platform.claude.com accessible through Claude in Chrome | June 8, 2026 |
| sync-context.js created with the npm run sync command | May 31, 2026 |

---

## Communication Dispatch System

| Item | Date Completed |
| :-- | :-- |
| The confirmation text after each agreement: recording an agreement to texts (lib/dispatch/agreement.js) requires who agreed, how, and the disclosure they were shown, writes all three to the event log, confirms the number, and queues the confirmation text as one the person set off, so it goes at once rather than waiting for the sending window. A number that sent STOP and agrees again gets a fresh confirmation. Its copy is the seeded placeholder until approved copy replaces it. Tested against the live database with a test-flagged account and stand-in senders, 15 checks passing (scripts/test-dispatch-agreement.mjs) | October 12, 2026 |
| The scheduler's cycle: a Cloudflare cron wakes the Worker every minute, and worker.js, which passes the site through unchanged, runs the scheduler's pass at /api/dispatch/run with the shared secret. The pass refuses until DISPATCH_RUN_SECRET is set as a Worker secret and both senders exist, so until the Postmark and Twilio keys arrive each wake is a refusal and nothing is sent. Tested locally in the Workers runtime: the site still loads, a wake without the secret is refused as unconfigured, a wake with it passes the check and is refused for want of senders, and a wrong secret is refused | October 12, 2026 |
| The queue: a failure that may pass is retried after 1 minute, 5 minutes, 30 minutes, and 2 hours, a failure no retry can fix fails at once, and a send out of attempts is recorded as exhausted for the Operational Dashboard. Each scheduler pass sends a message once, even with two passes running together. Tested against the live database with test-flagged rows and stand-in senders, 32 checks passing (scripts/test-dispatch-run.mjs) | October 7, 2026 |
| Message copy read from its stored field at send, with names and dates filled in, and a blank left unfilled stopping the send rather than reaching a person. The enqueue helper refuses the frame, another channel's copy, or copy that does not exist | October 7, 2026 |
| The email frame: a light card carrying the Swallow Seal as an inline vector and the sage accent, with the frame's fixed text read from stored copy, and a plain-text version of every email (scripts/test-dispatch-policy.mjs, 39 checks passing) | October 7, 2026 |

---

## Database

| Item | Date Completed |
| :-- | :-- |
| Database: the em dash restored in the seeded placeholder for the text-agreement confirmation, where the live row held a replacement character since the September 25 migration was applied. Applied to the live database | October 7, 2026 |
| Database: the email frame's fixed text stored as copy — each copy row is a message or the frame, there is exactly one frame and it is email, and its placeholder is seeded. Applied to the live database | October 7, 2026 |
| Database: storage for the Communication Dispatch System — the message queue, text agreements held by phone number, inbound texts, message copy as a field, and an append-only event log that outlives the account it records, all server-side only. Applied to the live database | September 25, 2026 |
| Database: a paid-through date that holds until it has ended in every timezone, so a customer is never locked out on the last day they paid for. Applied to the live database | September 18, 2026 |
| Database: the storage state every build gate reads — a three-month trial date set at signup, a paid-through date for storage that only the server writes, and row-level security that refuses new or edited messages, recipients, and uploads while storage is not current, leaving viewing and deleting open. Applied to the live database | September 18, 2026 |
| Database: staff-verified and vetoed paths added to trigger confirmations, additive and not yet read. Applied to the live database | July 16, 2026 |
| Database: the private legacy-media storage bucket, with its size ceiling and formats enforced by the bucket and each file keyed to its account. Applied to the live database | July 13, 2026 |
| Database: trusted contacts required to hold an email or a phone, with a primary promoted in one transaction. Applied to the live database | July 13, 2026 |
| Database: recipients required to hold an email or a phone, and a primary legacy created for every account at signup. Applied to the live database | July 13, 2026 |
| Database: the account row created by a trigger in the same transaction as each signup. Applied to the live database | July 13, 2026 |
| Database: the initial schema, the project's first migration, with row-level security on every table. Applied to the live database | July 13, 2026 |

---

## Content and Contacts

| Item | Date Completed |
| :-- | :-- |
| Building pauses while storage is not current: adding a message, media, or a recipient shows the storage notice instead, and the dashboard shows the trial days left. Tested live as a signed-in user, 18 checks passing (scripts/test-storage-gate.py) | September 18, 2026 |
| Video and photo upload into the private bucket, played back through signed links that expire in an hour | July 13, 2026 |
| Trusted contacts page: add them, write each a private note, and set the primary | July 13, 2026 |
| Messages and recipients: add the people a message is for, write it, and choose its delivery date and whether it stays in Posterity | July 13, 2026 |

---

## Stripe Integration

| Item | Date Completed |
| :-- | :-- |
| Storage renewal in test mode (lib/posterity/storage-billing.js). Automatic payments are on by default and can be turned off, and turning them off makes each renewal a payment request due on the renewal date, without moving that date. Turning them on without a saved card is refused. Storage years paid in advance are years rather than credit: each is a renewal that charges nothing, years bought later are added after those already held, a payment applied twice adds its years once, and afterward automatic payments or payment requests resume as the customer left them. Ending the subscription ends any unused prepaid years. They are held on the subscription's schedule with a 100%-off coupon, prepaid_storage_year, whose name is a placeholder. Stripe holds a schedule no more than 20 years ahead, so about 18 years can be prepaid at once. Collecting the payment for prepaid years is left to the cart. Within the Stripe dashboard, a failed storage charge is retried once, three days after the first attempt, and a subscription whose retry fails is marked unpaid, which pauses it rather than cancelling it, and Stripe's own customer emails are off. Tested on Stripe test clocks: automatic renewal, a charge that fails its retry, a renewal with automatic payments off and back on, and prepaid years with automatic payments on and off, 27 checks passing (scripts/test-storage-renewal.mjs) | October 12, 2026 |
| Test-mode product descriptions for Basic, Premium, and Legacy no longer name a cadence of quarterly, monthly, or weekly, since a customer chooses each delivery's date anywhere across the plan year, as the plan cards say | October 12, 2026 |
| The test-mode storage fee, Additional Recipient slots, and Posterity Custom recorded within lib/posterity/plans.js, held apart from the checkout catalog like Grace Storage so the public checkout refuses them until the cart is built | October 12, 2026 |
| Test-mode products created within the Stripe sandbox: One-Year Storage Fee at $9.99, paid once, for a skipped plan year or an added Reprise year; Additional Recipient Slot at $5 on Basic, $12 on Premium, and $25 on Legacy, one product per tier, paid once; and Posterity Custom with no price. Each carries its description. One test checkout session held Posterity Custom at an amount passed in at checkout, two storage fees, and four Basic slots, and Stripe totalled it correctly before the session was expired unpaid. The live-mode products remain | October 11, 2026 |
| Site Consistency Sweep: phase names on the homepage and the dashboard changed from Abeyance and Twilight to the confirmed Interlude and Reprise. The homepage's Posterity explanation and the dashboard's Posterity line each described a permanent archive kept within the account, which the specification does not hold, and each now carries the approved Posterity Phase line from Brand Copy. The other phase explanations stand as written. The database's phase values still read abeyance and twilight, and the dashboard shows them under the confirmed names | October 11, 2026 |
| Site Consistency Sweep: plan card bullets count Standard Deliveries and Feature Deliveries per plan year, read from the counts lib/posterity/plans.js now holds for each tier: 4 and 1 on Basic, 12 and 4 on Premium, 52 and 12 on Legacy. The handwritten note bullet and the cadence note beneath the cards say delivery rather than message | October 11, 2026 |
| Site Consistency Sweep: Grace Storage shown on the Posterity Grace card as Free, with Grace Storage at $4.99/year, the price read from lib/posterity/plans.js. Grace Storage is held there apart from the checkout catalog, naming its test-mode price, so the public checkout refuses it | October 11, 2026 |
| Site Consistency Sweep: a checkout that fails to open now leaves a message on its card and returns the button to rest. The message is a placeholder awaiting error messages under Product surface copy | October 11, 2026 |
| Site Consistency Sweep: the Contact Us links on Custom and Posterity Grace wrote to hello@posterity.app, an address outside Posterity's domain, and now write to admin@yourposterity.com, where the specification sends human correspondence. Every page was crawled signed out and signed in, and every link and asset resolves | October 11, 2026 |
| Site Consistency Sweep: test-mode product descriptions for Basic, Premium, and Legacy moved from the June prices of $39, $99, and $299 to $49, $129, and $399, and from messages and video messages to Standard and Feature Deliveries. The live-mode products take their descriptions when they are created | October 11, 2026 |
| Site Consistency Sweep: Get Started routing tested against the updated products. scripts/test-checkout.mjs now also checks the failed checkout message, the Contact Us routing on Custom and Posterity Grace, Grace Storage's displayed price, and that the public checkout refuses Custom, Grace, and Grace Storage, 26 checks passing | October 11, 2026 |
| Site Consistency Sweep: the site address, the Supabase authentication redirects, and the Stripe checkout return addresses moved from posterity-seven.vercel.app to www.yourposterity.com with the Cloudflare cutover recorded under Hosting Migration, and login and checkout were retested on the live site, 18 checks passing | October 11, 2026 |
| Stripe webhook reviewed and corrected ahead of activation. A database write that fails now answers Stripe with an error so Stripe retries it, where before it answered received for a payment never recorded. Each event is recorded by its Stripe event id within stripe_events and marked processed once handled, so a resent event changes nothing. Horizon's renewal date is read from the subscription item, where Stripe's current API keeps it. A paid storage year sets storage_paid_through to the end of its billing period and carries it forward on each renewal. The move from Horizon to Planning is logged within account_phase_events and happens once when two payments land together. Tested in test mode with Stripe forwarding webhooks to a local server, 27 checks passing (scripts/test-checkout.mjs) | October 6, 2026 |
| Checkout tested end to end in a browser for every tier in test mode: Horizon as a yearly subscription of $9.99, and Basic, Premium, and Legacy as one-time payments of $49, $129, and $399. Each was signed in through the login page, started from its own Get Started button, paid by test card, returned to the dashboard, and recorded within Stripe against the account, 18 checks passing (scripts/test-checkout.mjs). Horizon checkout had been failing because the catalog named a Stripe price no longer within the sandbox, and lib/posterity/plans.js now names the Horizon price created September 19, under the product Horizon / Posterity Social access | October 6, 2026 |
| Stale test-mode prices archived, and the Basic $49 price unarchived so checkout can use it | July 16, 2026 |
| Stripe webhook built at app/api/webhooks/stripe/route.js, signature-verified and writing to subscriptions, dormant until its secret is set and the endpoint is registered | July 16, 2026 |
| Checkout rebuilt: sign-in required, the price resolved on the server from lib/posterity/plans.js, the customer's identity sent to Stripe, and Horizon billed as a subscription while plans are one-time payments | July 16, 2026 |
| Test-mode prices moved to the July 2026 ladder of $49, $129, and $399, with display and charge aligned | July 15, 2026 |
| Stripe MCP added to mcp.json | June 7, 2026 |
| Stripe checkout working and tested for all tiers | June 3, 2026 |
| Stripe sandbox account created | June 1, 2026 |
| Four Stripe products created: Horizon, Basic, Premium, Legacy | June 1, 2026 |

---

## Plans Page Visual Updates

| Item | Date Completed |
| :-- | :-- |
| Card sizing and spacing updated | June 7, 2026 |
| Financial Hardship tier renamed to Posterity Grace | June 6, 2026 |
| Limited Availability badge added to the Legacy card | June 6, 2026 |
| Button uniformity applied across all cards | June 6, 2026 |
| June ladder applied, since superseded: Basic $99, Premium $249, Legacy $899. Later ladder changes may not have been logged | June 5, 2026 |
| All plan bullets updated to per plan year language | June 5, 2026 |
| Horizon description updated | June 5, 2026 |

---

## Homepage Visual Updates

| Item | Date Completed |
| :-- | :-- |
| Homepage cards updated to match the pricing cards | June 10, 2026 |
| Hamburger dropdown updated with logged in and logged out states | June 9, 2026 |
| Hero buttons removed | June 9, 2026 |
| Hero sublines replaced with approved copy | June 8, 2026 |
| Feature card copy updated: A Living Legacy, On Your Terms, Fully Automated, Fully Protected | June 8, 2026 |
| Nav item Pricing renamed to Plans | June 8, 2026 |
| Login renamed to Account with state-dependent logic | June 8, 2026 |

---

## Authentication

| Item | Date Completed |
| :-- | :-- |
| Three-layer sign-in gate: proxy.js, a server-side check on every private page, and row-level security beneath both | July 13, 2026 |
| Signup rebuilt as a real account signup, with sessions moved from browser storage to cookies | July 13, 2026 |
| PWA installed on Android | June 2, 2026 |
| Supabase authentication — email and password, email confirmation disabled | May 30, 2026 |

---

## Core Pages Built

| Item | Date Completed |
| :-- | :-- |
| Pricing page, all six tiers | June 1, 2026 |
| Dashboard page | May 30, 2026 |
| Global nav within layout.js — dropdown, all pages | May 29, 2026 |
| Login page | May 28, 2026 |
| Signup page | May 28, 2026 |
| Homepage | May 26, 2026 |

---

## Project Foundation

| Item | Date Completed |
| :-- | :-- |
| Posterity_Master_Specification.md and Social_Media_Integration_System.md added as exports of their Google Docs, replacing CONTEXT_for_posterity.md | September 19, 2026 |
| Repository cleanup — retired Cursor tooling, the PDF pipeline, and the Project Documents copies removed | September 19, 2026 |
| Custom domain connected within Vercel — www.yourposterity.com serves the site and yourposterity.com redirects to it, through records set to DNS only within Cloudflare, and posterity-seven.vercel.app remains valid | September 15, 2026 |
| .cursorrules file created within the project root with full project context | June 7, 2026 |
| Project Documents folder created within the project root | May 31, 2026 |
| Vercel hosting configured, project live at posterity-seven.vercel.app | May 27, 2026 |
| Next.js project initialized | May 25, 2026 |
| GitHub repository created, private — jerthrwicked/posterity | May 25, 2026 |

---

## Development Environment

| Item | Date Completed |
| :-- | :-- |
| Cursor Pro+ subscription active — Sonnet 4.6 Max enabled, Medium throttling resolved | June 4, 2026 |
| Privacy mode disabled within Cursor, usage-based spending enabled | June 4, 2026 |
| Windows 11 development environment configured | May 25, 2026 |
| Node.js v24.16.0 installed | May 25, 2026 |
| Git installed and configured | May 25, 2026 |
| Cursor installed and configured as the primary IDE | May 25, 2026 |

---

## Rules and Operating Procedures

| Item | Date Completed |
| :-- | :-- |
| scripts/sb.sh encodes each query with Node rather than Python, since no Python is installed on the founder's machine | September 25, 2026 |
| CLAUDE.md combined into one file for both builders, naming Posterity_Build_Roadmap.md and Posterity_Build_Log.md as the build record | September 15, 2026 |
| Pre-commit hook (scripts/hooks/pre-commit) retargeted — a commit touching code, migrations, or scripts is rejected unless Posterity_Build_Log.md is also staged | September 15, 2026 |
| Rule 31 added — the first Claude Code prompt each session checks whether npm run dev is running | June 13, 2026 |
| Rules 26 through 33 established and documented within the context | June 3 to June 13, 2026 |
| Rules 1 through 25 established and documented within the context | May 25 to June 2, 2026 |
| Operating procedures documented — PDF pipeline, session start, session end, approval gate, branches | May 28, 2026 |
| Session workflow documented | May 26, 2026 |
