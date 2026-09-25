# POSTERITY

## *Build Roadmap*

This document is the living instruction manual for building Posterity. It carries every remaining build item in suggested build order. A working reference for the founder, for collaborators, and for the Claude Code instances that build from it. Completeness and accuracy come before presentation.

The Master Specification is the reference this file points at. The roadmap states what gets built and in what order. The specification states what the thing is and how it behaves. Where the two disagree, the specification wins and the roadmap is corrected. Every stage names the subjects its work is governed by. The builder searches the markdown exports of the specification and its design records for them, and reads what returns before writing anything, so the work begins from a body of material rather than from a task list alone.

Link: [Posterity Master Specification](https://docs.google.com/document/d/14OoN3GlzDnJjo0ll6hIN6pjU7nCEsWB2MA39R-jWhPY/edit?usp=sharing)

Design and writing work carried by the founder lives within a separate work order. Stages that wait on an item there say so.

Link: [Posterity Founder Build Roadmap](https://docs.google.com/document/d/1YdA0yvA2-0Lxhvv06IcM8x7CG2HYl7lRm7ldr3EGUaM/edit?usp=sharing)

**Project Files**

Four artifacts carry this project's build record. Two are markdown files within the repository and hold the authority. Two are Google Docs, each a readable copy of one markdown file, and neither carries authority of its own.

Posterity_Build_Roadmap.md holds every remaining build item in suggested build order. Its readable copy is the Build Roadmap Doc.

Posterity_Build_Log.md holds the record of everything already built. Its readable copy is the Build Log Doc.

# How to Use This Document

Begin work by reading Current Status. This section describes where the project stands as a whole — what is current, what is open, and what blocks the build. It is rewritten when the picture changes rather than updated after each session. The record of what has been built lives within the Build Log.

Remaining work lives in suggested build order. Completed work moves to the Build Log, which is organized by category with the newest entry first within each. Nothing is ever removed from it, so the log carries the full history of the build. A build item carrying a status holds its place within its stage until it is built, and the status is dropped when it moves. A stage records no progress of its own. It persists for as long as any build item remains within it, and it is finished when its last build item moves to the Build Log.

Every stage covers one system and states its status in its opening line, written as the word Status followed by its value. A stage that carries sub-stages is the exception, and each of its sub-stages does both instead. A stage number carrying sub-stages beneath it groups them and holds no system of its own, and a status placed on it reaches every sub-stage within it. A heading within a stage groups build items inside that system rather than marking a separate one. Within any stage or heading, explanation comes first and build items follow beneath the Build Items label, which carries no status of its own. A system large enough to stand on its own is given its own stage number.

A status applies to whatever carries it and to everything beneath it. Where a status halts progression, it reaches further, and it also stops everything after it that depends on what it sits on. Each stage opens by stating why it sits where it does, and that reasoning is what establishes the dependency. A stage that depends on nothing gated proceeds, and where that independence matters it is stated where the stage opens. A heading or a single build item carries its own status in the same form, written directly after the text naming what gets built with nothing between them, and any reason, condition, or open question follows the status. Anything carrying no status of its own takes the status above it, so the nearest status always governs. Nothing is open to a builder unless it reads designed and nothing above it in the hierarchy carries another status. A status behaves the same way wherever it sits within the hierarchy, and its position sets how far it reaches rather than what it does. Status is set by the founder, or by co-founder where the situation allows. Halted is the exception, since it records what the build encountered rather than what was decided. Claude Code sets and clears the halted status, and whether the halt stops only what it sits on or everything beneath and after it is decided by the founder or co-founder. Following is a list of all status types within the roadmap.

Status types:

- **Designed**. Everything the stage, sub-stage, heading, or build item requires is designed in full. It is ready to be built.
- **Requires input**. Named issues or questions remain open on everything that carries this status. Further work can proceed unimpeded prior to its resolution.
- **Requires input and gates progression**. Named issues or questions remain open on everything that carries this status. Nothing beneath it proceeds prior to its resolution, and neither does anything after it that depends on it.
- **Requires system design**. The design itself remains outstanding on everything that carries this status. Nothing beneath it proceeds prior to its resolution, and neither does anything after it that depends on it.
- **Halted**. Work began and stopped against something outside whatever carries this status, and the cause is recorded alongside it. Whether further work can proceed is decided case by case.

All statuses maintain the ability to be shifted into another status if warranted. Resolutions of statuses, as well as any status shifts, must be appropriately maintained on progression.

User Profiles and Settings are containers rather than features. Stage 4.3 builds the User Profiles shell and Stage 4.2 builds Settings, each with the panels its own stage owns. Every later stage that adds to either carries a line reading User Profiles insertion or Settings insertion, naming what it adds. No stage waits on another to touch them.

Customer-facing text the build needs, and that has no approved copy yet, is built as a placeholder. A placeholder is stored as a field the code reads rather than written into its logic, so approved copy later replaces it as a content change. Every placeholder opens with the marker [Placeholder: and names the Writing Requirements item within the Founder Build Roadmap it waits on. Once that copy is approved, Claude Code finds the placeholder by its marker and replaces it. Copy already approved within the Master Specification, whether in Brand Copy or quoted within a section, is used exactly as written. Before launch, a search for the marker returns nothing, so no placeholder reaches a customer.

A stage number, once assigned, always points at the same system, since cross-references throughout the project depend on it. A system that earns its own number later takes the next decimal within the stage it sits in rather than forcing a renumber. The Master Specification carries no stage numbers, by design. Build order lives here and nowhere else.

# How to Manually Edit This Document

Claude Code edits this file as he builds. When a task is finished he removes it from its stage and writes it into the Build Log, so both files are edited every time something closes out. The roadmap is Posterity_Build_Roadmap.md and the log is Posterity_Build_Log.md, and neither is ever updated without the other. Build progress is the whole of his standing permission. Nothing else within either file changes without founder or co-founder approval, and he never edits the Master Specification or any other project document.

Every other change is authored within a Claude.ai session and approved there by the founder. The Doc is never edited by hand, since it is a copy and anything written into it is lost at the next refresh. Claude compiles the approved text into a Claude Code prompt naming the file, the exact existing text, and the exact text replacing it, with new text placed by what it follows and what follows it.

Claude Code makes the change on a short branch of his own, cut from the latest main, and prints each changed section back rather than reporting that he wrote it, which surfaces a truncated or misplaced write while the work that produced it is still open. On the founder's approval he commits, pushes the branch, opens a pull request into main with the other founder as reviewer, and merges it at once, so the change reaches the other founder as a notification without waiting on him. The branch is deleted in the same step. Any builder working on a branch of his own merges main into it once the pull request lands, since every branch carries its own copy of this file.

The markdown is the record and every change reaches it directly, whether it is build progress Claude Code writes on his own or authored text handed to him. Nothing is ever written back into the markdown from the Doc. The Doc is refreshed from main after every merge by pasting the markdown over the existing document with Paste from Markdown, since a new document carries a new file identifier and every link pointing at the roadmap would stop resolving. It is refreshed more often where a second builder is closing out work, since the Doc goes stale the moment anything is written into the markdown.

# Current Status

As of September 25, 2026.

The Master Specification is current. The Social Media Integration and Delivery System design records are complete, and each is the single authoritative copy of every rule within it. Posterity Social is complete in concept and awaits its own design pass. Every build-stage reference has been swept out of the Master Specification, so this file is the only place build order is recorded.

Stage 3 holds the only written stages. Stage 3.1, Stage 3.3, and Stage 3.4 read designed, with open items marked where they sit. Stage 3.2 requires input and Stage 3.5 requires system design, and neither holds up the stages around it. Walker's July Stripe work stands in test mode, and Stage 3.1 holds what remains. The payment model is decided: upfront pre-load with year-by-year release.

Stage 4 is being written within a separate outline and lands here once each sub-stage is reconfirmed. Its numbering is fixed: 4.1 Account Status, 4.2 Settings, 4.3 User Profiles, 4.4 Video and Image Systems, 4.5 Content Builder and Delivery System, 4.6 Legacy Guard Setup, 4.7 Account Lifecycle and Delivery Automation, 4.8 Check-in System, and 4.9 Test and Preview Mode. Every stage after Stage 4 is unwritten.

Link: [Stage 4 Outline](https://docs.google.com/document/d/1AsaowbnlZ9CoX4lDu70yzBmQh5ex1WmvacbCr2wxVpY/edit?usp=sharing)

# STAGE 3

### STAGE 3.1 — Stripe Integration

Status: designed.

Payment is the first thing the application needs and nothing else within the build depends on it, so it opens the sequence. Subjects: subscription tiers, the Horizon tier, custom plans and Posterity Grace, plan years and skipped years, additional recipients, and the financial architecture.

#### Pricing and Products

Build Items:

- Test checkout end to end in a browser for each tier. It has never been run end to end
- Create the live-mode prices once test checkout passes. Only test-mode prices exist, and a price must be active before checkout can use it
- Horizon remains $9.99 per year, recurring. No change
- Create Posterity Grace Storage at $4.99 per year. Assigned to the account when a Grace plan request is approved, with no public checkout
- A Grace plan carries no charge and no Stripe product. Approving a Grace plan request places one Grace plan year carrying the Grace preset and moves the account's storage subscription to Grace Storage, which stays in place if the account later funds paid plans. An account holds one Grace plan year at most
- Create Posterity non-recurring storage charge at the same price as Horizon. It covers a skipped plan year and an additional Reprise year alike. Skipped years are added to the cart automatically and stack per year. Reprise years are purchased on demand, by the customer in advance or by a Legacy Guard during the phase, so the charge is payable within plan selection, Purchases, and the Legacy Guard portal
- Create Additional Recipient slots, priced by tier: $5 on Basic, $12 on Premium, $25 on Legacy, writing the product description for each within Stripe. Alternative Recipients are fixed at two per piece of content across all tiers and are never purchasable
- Create a Posterity Custom product with no fixed price. An admin sets each Custom plan's price on its plan record, and checkout passes that amount to Stripe at the moment of payment, so no per-customer products or Price IDs are created. A Custom plan checks out within the same cart as storage fees, skipped years, and Additional Recipient slots
- Storage fees are payable in advance for any number of years a customer chooses
- Storage renews by automatic payment from the customer's saved payment method by default. When the customer turns automatic payments off, the same subscription sends a payment request at each renewal instead, due on the same date. Stripe's own customer emails stay off, since every automated message leaves through the Communication Dispatch System
- Each storage year paid in advance moves the subscription's next charge back by one year, and automatic payments resume once the prepaid years are used

#### Stripe to Supabase

Build Items:

- Before activating the webhook built at app/api/webhooks/stripe/route.js, review which plan year each payment funds and how skipped-year storage is recorded, and make its one-time insert idempotent on Stripe retries
- Activate the webhook by setting STRIPE_WEBHOOK_SECRET and registering the endpoint for checkout.session.completed, customer.subscription.updated, and customer.subscription.deleted
- Set Stripe to retry a failed storage charge once, three days after the first attempt. Record within Supabase when that retry fails or a payment request goes unpaid past its due date, so the account status check built within Stage 4.1 and the storage lapse sequence built within Stage 4.7 can both read it
- Test storage renewal by card using Stripe's test clocks: a successful automatic payment, a charge that fails its retry, a renewal with automatic payments turned off, and a renewal following prepaid years
- Refunds through Stripe. Status: requires input. The refund policy is written and the mechanism is not — what the customer does, what staff do, what Stripe does, and what happens to the content. Carried within the founder work order
- The three-month free trial, held within Supabase rather than Stripe since it takes no payment method: one per account, beginning at signup, granting content building without Posterity Social access

#### PayPal

Build Items:

- Add PayPal through Stripe's native integration. No separate PayPal account or API
- Confirm PayPal carries recurring subscriptions, including Horizon at $9.99 per year
- Confirm the non-recurring storage charge completes through PayPal
- Confirm a Custom plan's price, passed in at checkout, completes through PayPal
- Confirm a customer paying by PayPal can turn automatic payments off and pay each renewal through a payment request
- Dedicated sandbox testing before launch, covering a successful automatic payment, a charge that fails its retry, and a renewal with automatic payments turned off. Renewal reliability differs from card billing

#### Dashboard Access

Build Items:

- Every signed-in account reaches User Profiles, and the account status check built within Stage 4.1 governs what opens within it
- Open intake at launch. No approval gating, cold traffic from day one

#### Site Consistency Sweep

Runs after the Stripe work, not before it. The live application carries content predating several confirmed decisions.

Build Items:

- Phase names on the homepage and the dashboard read Abeyance and Twilight. The confirmed names are Interlude and Reprise
- Plan card bullets count messages and video messages. The confirmed terminology is Standard Deliveries and Feature Deliveries
- Grace Storage does not appear
- Custom routes to a mail link rather than a contact surface, and Grace is shown as Contact Us rather than as a free plan chosen at plan selection
- Get Started routing is untested against the updated products
- Various links contain incorrect or outdated material and some may be inactive
- The site address variable, the Supabase authentication redirects, and the Stripe checkout return addresses still point at posterity-seven.vercel.app. Move each to www.yourposterity.com and retest login and checkout.

### STAGE 3.2 — Twilio

Status: requires input. Each open issue is named on the heading or build item it affects.

Twilio carries every voice, SMS, and MMS path within the system. It is provisioned before the Communication Dispatch System, which sends through it.

Subjects: customer contact and communication, video and content delivery, legal and compliance.

#### Carrier Registration

Status: requires input. Registration waits on the business formation and the Settings build within Stage 4.2.

Carriers block text messages to United States numbers from any number not registered to an approved campaign, so text messaging stays disabled on the Posterity number until registration clears.

Registration follows the business formation, since a company holding an employer identification number registers as a business rather than as a sole proprietor. It also follows the Settings build within Stage 4.2, since the review asks for evidence of how people agree to receive texts.

Build Items:

- Publish a privacy policy page and a text message terms page on yourposterity.com. Status: requires input. The registration form requires a public link to each. Copy for both pages remains unwritten and is carried within the founder work order.
- Submit the brand and campaign registration, with a campaign description, sample messages, and the opt-in evidence. Status: requires input. The campaign description and sample messages remain unwritten, and the brand registers under the business.
- Confirm SMS capability is configured and tested once the campaign is approved.
- Confirm MMS capability, including the size ceiling per message, is configured and tested once the campaign is approved.

#### Account and Voicemail

Build Items:

- Move the Twilio account and its customer profile to the business. Status: requires input. The account is registered to the founder as an individual, and the move follows the business registration.
- Voicemail alert. Status: requires input. Addressed later in the build. Nothing alerts staff to a new voicemail until the Operational Dashboard surfaces voicemails as tasks, and whether an interim alert comes before that stage remains open.

### STAGE 3.3 — Postmark

Status: designed.

Postmark carries every automated email the system sends. It is provisioned before the Communication Dispatch System, which sends through it. It does not depend on Twilio and neither stage blocks the other.

Subjects: customer contact and communication.

Build Items:

- Set up sending from admin@yourposterity.com. Status: requires input. The address receives through forwarding into posterity.admin@gmail.com and cannot send replies, and the Google Workspace evaluation that would allow it is tabled within the specification.
- Move the domain's email authentication policy beyond monitoring. Status: requires input. The policy stays at monitoring until its reports show every legitimate sender passing, including Postmark and the forwarding.
- Move to the Basic plan when the first customer subscribes. The free tier stops delivering at its cap rather than billing an overage, so this is a launch condition rather than a judgment.

### STAGE 3.4 — The Communication Dispatch System

Status: designed.

The single path every automated message within Posterity takes on its way out. The system itself is specified in full within the Master Specification, and what is built here is the mechanism rather than any cascade that calls it. Social media is a third channel of the same system and is built within the Meta stage.

It is built in this early stage because the delivery automation and the Check-in System both call it, and both are built within Stage 4.7 and Stage 4.8. It depends on Twilio and Postmark, since both are the channels it sends through. Its email channel sends live through Postmark, and its text message channel is built and tested against Twilio's test credentials, so this stage does not wait on carrier registration within Stage 3.2. Cascades are not built here. Each is built within the stage that owns its trigger, and each is a caller rather than a part of the Communication Dispatch System.

Subjects: the Communication Dispatch System, customer contact and communication, delivery, automation summary.

Build Items:

- A scheduler that wakes on a cycle and asks what is due
- A queue holding what the scheduler returns, so a failure retries rather than disappearing. A send that exhausts its retries is recorded as a failure for the Operational Dashboard to surface in a later stage
- A Postmark sender and a Twilio sender, each taking a message and a destination. Both are built as channels behind one interface, since Meta joins them as a third channel when social media publishing is built
- A Postmark sandbox server for test sends. It accepts messages without delivering them, so testing does not draw from the free tier's monthly allowance.
- Channel policy applied at send, texting only a person whose agreement is on file. This covers the sending window, immediate sends for texts a person sets off themselves, the confirmation text after each agreement, the Reassigned Numbers Database check, and inbound texts read for STOP replies and check-ins by text
- An event log recording every send by account and by outcome, along with every agreement to texts and every stop, so a delivery can be evidenced years later
- Message copy stored as a field the Communication Dispatch System reads rather than as text inside the trigger logic, so approved copy replaces placeholder copy as a content change rather than a code change
- Postmark account approval, requested once this system sends email and the Site Consistency Sweep within Stage 3.1 is finished. Until approval, Postmark delivers only to addresses on yourposterity.com.

### STAGE 3.5 — Hosting Migration

Status: requires system design. The migration plan remains outstanding.

The site runs on Vercel. It needs to move hosting to Cloudflare, where the domain and its records already sit. Nothing else within Stage 3 depends on the move, so it closes the stage and holds nothing ahead of it.

Subjects: tech stack, environment variables, important links.

Build Items:

- A migration plan covering the Next.js build adapter for Cloudflare, the environment variables, the deployment flow from GitHub, and the Supabase and Stripe redirect addresses, decided with the co-founder.
- Deploy the site on Cloudflare and point the yourposterity.com and www records at it in place of Vercel.
- Retest login, checkout, and every link within automated email against the new host.
- Retire the Vercel project once the Cloudflare deployment is confirmed.
