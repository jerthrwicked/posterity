# POSTERITY

## *Build Roadmap*

This document is the living instruction manual for building Posterity. It carries every remaining build item in suggested build order. A working reference for the founder, for collaborators, and for the Claude Code instances that build from it. Completeness and accuracy come before presentation.

The Master Specification is the reference this file points at. The roadmap states what gets built and in what order. The specification states what the thing is and how it behaves. Where the two disagree, the specification wins and the roadmap is corrected. Every stage names the subjects its work is governed by. The builder pulls the markdown of the specification and its design records fresh from their Docs, as CLAUDE.md sets out. It searches that markdown for a stage's subjects and reads what returns before writing anything. The work therefore begins from a body of material rather than from a task list alone.

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

Claude Code makes the change on a short branch of his own, cut from the latest main, and prints each changed section back rather than reporting that he wrote it, which surfaces a truncated or misplaced write while the work that produced it is still open. On the founder's approval he commits, pushes the branch, opens a pull request into main, and merges it at once. A cloud session cannot delete a remote branch, so the merged branch stays on GitHub until it is deleted there on the founder's go. Any builder working on a branch of his own merges main into it once the pull request lands, since every branch carries its own copy of this file.

The markdown is the record and every change reaches it directly, whether it is build progress Claude Code writes on his own or authored text handed to him. Nothing is ever written back into the markdown from the Doc. The Doc is refreshed from main after every merge by pasting the markdown over the existing document with Paste from Markdown, since a new document carries a new file identifier and every link pointing at the roadmap would stop resolving. It is refreshed more often where a second builder is closing out work, since the Doc goes stale the moment anything is written into the markdown.

# Current Status

As of October 26, 2026.

The Master Specification is current. The Social Media Integration and Delivery System design records are complete, and each is the single authoritative copy of every rule within it. Posterity Social is complete in concept and awaits its own design pass. Every build-stage reference has been swept out of the Master Specification, so this file is the only place build order is recorded.

Stage 3 and Stage 4 hold the written stages. Stage 3.1, Stage 3.3, and Stage 3.4 read designed, with open items marked where they sit. Stage 3.2 and Stage 3.5 require input, and neither holds up the stages around it. The site has run on Cloudflare since October 11, and what remains within Stage 3.5 is the deployment flow and retiring the Vercel project.

Walker's Stripe work stands in test mode, and Stage 3.1 holds what remains. The storage state was built and applied to the live database on September 18: the three-month free trial on every account, a paid-through date only the server writes, and a gate at the database that pauses building, not viewing, while storage is not current. Checkout was tested end to end in a browser for every tier on October 6, and the Site Consistency Sweep was finished on October 11. Every test-mode product exists, and storage renewal, automatic payments, and prepaid years were built on October 12. The live-mode products wait on the business formation, since Stripe's live mode is activated under the business. The plan payments the webhook records are built with the cart within Stage 4.3, which carries each payment's plan and plan year, and the failed storage charge record, refunds, and PayPal return within Stage 4.1, Stage 4.2, and Stage 4.3 as each first needs them. The payment model is decided: upfront pre-load with year-by-year release.

Stage 3.4 is under way. Its storage is applied to the live database, and the queue, the channel policy, the email frame, the event log, the confirmation text after each agreement, the scheduler's cycle, and both senders are built. Nothing sends yet. The Postmark and Twilio keys and the scheduler's shared secret were set as Worker secrets by October 26. The Postmark sandbox server and the test against Twilio's test credentials remain.

Stage 4 was finalized within its own Doc on September 25, 2026, and joined this file on October 26, 2026. Stage 4.1 is the next stage open to build. Stage 4 follows Stage 3, and the Stage 3 items still open beside it do not hold it, since each that Stage 4 needs returns within the sub-stage that first needs it. Every stage after Stage 4 is held within the Build Queue.

# STAGE 3

### STAGE 3.1 — Stripe Integration

Status: designed.

Payment is the first thing the application needs and nothing else within the build depends on it, so it opens the sequence. Subjects: subscription tiers, the Horizon tier, custom plans and Posterity Grace, plan years and skipped years, additional recipients, and the financial architecture.

#### Pricing and Products

Status: requires input. The live-mode products wait on the business formation, since Stripe's live mode is activated under the business. Everything within this heading stands in test mode until then.

Build Items:

- Create the live-mode prices once test checkout passes. Only test-mode prices exist, and a price must be active before checkout can use it
- Horizon remains $9.99 per year, recurring. No change
- Create Posterity Grace Storage at $4.99 per year. Assigned to the account when a Grace plan request is approved, with no public checkout. A test-mode price already exists within the sandbox, created September 19, 2026 under the product name Grace Storage with its description written. The live-mode product remains
- A Grace plan carries no charge and no Stripe product. Approving a Grace plan request places one Grace plan year carrying the Grace preset and moves the account's storage subscription to Grace Storage, which stays in place if the account later funds paid plans. An account holds one Grace plan year at most
- Create Posterity non-recurring storage charge at the same price as Horizon. It covers a skipped plan year and an additional Reprise year alike. Skipped years are added to the cart automatically and stack per year. Reprise years are purchased on demand, by the customer in advance or by a Legacy Guard during the phase, so the charge is payable within plan selection, Purchases, and the Legacy Guard portal. A test-mode price already exists within the sandbox, created October 11, 2026 under the product name One-Year Storage Fee with its description written. The live-mode product remains
- Create Additional Recipient slots, priced by tier: $5 on Basic, $12 on Premium, $25 on Legacy, writing the product description for each within Stripe. Alternative Recipients are fixed at two per piece of content across all tiers and are never purchasable. Test-mode prices already exist within the sandbox, created October 11, 2026 as one product per tier under the names Additional Recipient Slot — Basic, Additional Recipient Slot — Premium, and Additional Recipient Slot — Legacy, each with its description written. The live-mode products remain
- Create a Posterity Custom product with no fixed price. An admin sets each Custom plan's price on its plan record, and checkout passes that amount to Stripe at the moment of payment, so no per-customer products or Price IDs are created. A Custom plan checks out within the same cart as storage fees, skipped years, and Additional Recipient slots. A test-mode product already exists within the sandbox, created October 11, 2026 under the name Posterity Custom with its description written and no price. The live-mode product remains
- Storage fees are payable in advance for any number of years a customer chooses. The prepaid years were built on October 12, 2026. Stripe holds them no more than 20 years ahead, so about 18 years can be prepaid at once

#### Stripe to Supabase

Build Items:

- Before activating the webhook built at app/api/webhooks/stripe/route.js, decide which plan year each payment funds and how skipped-year storage is recorded. Checkout sends a tier and no plan year, since no cart exists yet. A plan payment belongs on its row within plans and a skipped year within storage_fees, and until then the webhook records each plan payment within subscriptions. It is built with the cart within Stage 4.3, which carries each payment's plan and plan year
- Activate the webhook by setting STRIPE_WEBHOOK_SECRET and registering the endpoint for checkout.session.completed, customer.subscription.updated, and customer.subscription.deleted
- Record within Supabase when a failed storage charge's retry fails or a payment request goes unpaid past its due date, so the account status check built within Stage 4.1 and the storage lapse sequence built within Stage 4.7 can both read it. It is built with the account status check, the first thing to read it. Stripe was set on October 12, 2026 to retry a failed storage charge once, three days after the first attempt, and to mark the subscription unpaid when that retry fails
- Refunds through Stripe, following the refund policy held within Legal and Compliance. A customer's plan deletion, downgrade, or account deletion issues its refund when it is made. A lapsed account's deletion issues its refund from a staff task built within the Operational Dashboard stage. It is built with account deletion within Stage 4.2, the first thing to issue one

#### PayPal

It is added once the cart within Stage 4.3 takes payment, so every path it is confirmed against exists.

Build Items:

- Add PayPal through Stripe's native integration. No separate PayPal account or API
- Confirm PayPal carries recurring subscriptions, including Horizon at $9.99 per year
- Confirm the non-recurring storage charge completes through PayPal
- Confirm a Custom plan's price, passed in at checkout, completes through PayPal
- Confirm a customer paying by PayPal can turn automatic payments off and pay each renewal through a payment request
- Confirm a refund issues through PayPal
- Dedicated sandbox testing before launch, covering a successful automatic payment, a charge that fails its retry, and a renewal with automatic payments turned off. Renewal reliability differs from card billing

#### Dashboard Access

Build Items:

- Every signed-in account reaches User Profiles, and the account status check built within Stage 4.1 governs what opens within it
- Open intake at launch. No approval gating, cold traffic from day one

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
- Register an account with the Reassigned Numbers Database at reassigned.us, submitted alongside the brand and campaign registration. The number check within Stage 3.4 waits on it.
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

- Set up automated sending from posterity@yourposterity.com. Replies go to admin@yourposterity.com under the rule held within Customer Contact and Communication. Mail sent to the address directly forwards through Cloudflare, the same as admin@yourposterity.com.
- Move the domain's email authentication policy beyond monitoring. Status: requires input. The policy stays at monitoring until its reports show every legitimate sender passing, including Postmark and the forwarding.
- Move to the Basic plan when the first customer subscribes. The free tier stops delivering at its cap rather than billing an overage, so this is a launch condition rather than a judgment.

### STAGE 3.4 — The Communication Dispatch System

Status: designed.

The single path every automated message within Posterity takes on its way out. The system itself is specified in full within the Master Specification, and what is built here is the mechanism rather than any cascade that calls it. Social media is a third channel of the same system and is built within the Meta stage.

It is built in this early stage because the delivery automation and the Check-in System both call it, and both are built within Stage 4.7 and Stage 4.8. It depends on Twilio and Postmark, since both are the channels it sends through. Its email channel sends live through Postmark, and its text message channel is built and tested against Twilio's test credentials, so this stage does not wait on carrier registration within Stage 3.2. Cascades are not built here. Each is built within the stage that owns its trigger, and each is a caller rather than a part of the Communication Dispatch System.

Subjects: the Communication Dispatch System, customer contact and communication, delivery, automation summary.

Build Items:

- A Postmark sender and a Twilio sender, each taking a message and a destination. Both are built as channels behind one interface, since Meta joins them as a third channel when social media publishing is built. Both senders were built on October 12, 2026, and the scheduler builds them from the deploy's keys. The Postmark sender was tested against Postmark's test token and the Twilio sender against stand-in answers. A test against Twilio's test credentials remains, along with the Postmark and Twilio keys set as Worker secrets
- A Postmark sandbox server for test sends. It accepts messages without delivering them, so testing does not draw from the free tier's monthly allowance.
- Channel policy applied at send, texting only a person whose agreement is on file. This covers the sending window, immediate sends for texts a person sets off themselves, the confirmation text after each agreement, the Reassigned Numbers Database check, and inbound texts read for STOP replies and check-ins by text. The confirmation text after each agreement was built on October 12, 2026, queued as each agreement is recorded and tested with stand-in senders, and its copy remains the seeded placeholder
- An event log recording every send by account and by outcome, along with every agreement to texts and every stop, so a delivery can be evidenced years later. The log was built with the queue and the confirmation text and was tested by October 12, 2026. It records each send attempt and its outcome by account, every agreement with who agreed, how, and the disclosure shown, and every stop. It accepts no edits and outlasts a deleted account. Delivered and bounced outcomes remain, since Postmark and Twilio report them only once the senders exist
- The Swallow Seal within the email frame. Status: requires input. The frame carries the seal as an inline vector, as the Website Design Standards require, and Gmail and Outlook show no vector image, so the seal is absent for their readers. Should the frame carry a high-resolution picture of the seal, generated from the vector and used only in email, as an approved exception to the rule against raster? The alternative keeps the vector alone and sets the name Posterity in text beside it.
- Texts to numbers outside North America. Status: requires input. Channel policy judges the sending window by area code, and the table it reads covers only the +1 numbers of the United States, Canada, and the Caribbean, so a number from any other country has no local time to judge. Such a number is not texted, and its messages go by email alone. Canadian and Caribbean numbers share the +1 code and are texted under the same rules as the United States. Should Posterity text numbers outside North America, and should it text the Canadian and Caribbean numbers it texts now? Carrier registration, consent rules, and pricing differ by country.
- Postmark account approval, requested once this system sends email. The Site Consistency Sweep it also waited on was finished on October 11, 2026. Until approval, Postmark delivers only to addresses on yourposterity.com.

### STAGE 3.5 — Hosting Migration

Status: requires input. Each open issue is named on the build item it affects.

The site moved from Vercel to Cloudflare on October 11, 2026, where the domain and its records already sat, and the move is recorded under Hosting Migration within the Build Log. The plan and the way back are in BUILD/CLOUDFLARE_MIGRATION.md. Nothing else within Stage 3 depends on the move, so it closes the stage and holds nothing ahead of it.

Subjects: tech stack, environment variables, important links.

Build Items:

- Deploy from GitHub. Status: requires input. Cloudflare's Workers Builds can deploy main on every push, which needs Jeremy to install Cloudflare's GitHub app on jerthrwicked/posterity. The alternative keeps deploying by hand with wrangler, which keeps a person between every push and the live site
- Retest every link within automated email against the new host. Login and checkout were retested on the live site on October 11, 2026. No automated email sends yet, so its links wait on the senders within Stage 3.4
- Retire the Vercel project. Status: requires input. The migration plan kept Vercel for a week as the way back, and that week ended October 18, 2026. Retiring it removes that way back, so it waits on the founder's go

# STAGE 4

Stage 4 builds the customer's side of Posterity, from what an account may do through the delivery of its content. It follows Stage 3 because every payment, message, and record within it runs through what Stage 3 builds. It is a grouping number with no status of its own, and its sub-stages run in the order each one first needs the one before it. Five conventions hold across every sub-stage:

- Every surface reads the account status check built within 4.1 rather than checking the account on its own.
- Every automated message leaves through the Communication Dispatch System. Customer-facing text without approved copy follows the placeholder convention within How to Use.
- Every staff task a sub-stage creates is recorded for the Operational Dashboard stage to surface.
- Every customer election, confirmation, and system event is written to the event log built within Stage 3.4. The Operational Dashboard stage builds admin notifications from that log, so no sub-stage builds its own.
- Every record and file ties to its account, so account deletion removes it. The event log is the exception and follows the retention rule held within Legal and Compliance. Every account deletion ends its storage subscription under the rule held within Stage 3.1.

### STAGE 4.1 — Account Status

Status: designed.

It comes first because every surface after it reads what the account may do, so that reading exists before any surface is built.

Subjects: account lifecycle and phases, key terms, Horizon tier, storage lapse grace period, plan year system, posterity social, custom plans and posterity grace.

Build Items:

- The account's phase, set to Horizon at signup. Each transition is written by the sub-stage that owns it: initiation and the return to Horizon by User Profiles, and every transition after Planning by the account lifecycle. 5.4 also writes initiation when a Legacy Guard's payment funds an account's first plan. The account lifecycle also writes the return to Planning through Account Restoration.
- The account status check, the single reading every surface uses. It reports the phase, the storage standing (trial, current, or lapsed), the storage product beside it, whether building is open, and the state of Posterity Social. That state follows the rule held within the Posterity Social document. Storage standing ends with the storage subscription at the Account Trigger, and Account Restoration brings it back.
- Beyond the phase, the check reads only the trial and payment records Stage 3.1 writes. It works out the building lock from the lapse date, so it depends on nothing built after it.
- Every signed-in account reaches User Profiles, and the check governs what opens within it.

### STAGE 4.2 — Settings

Status: designed.

It depends only on Stage 3 and the account status check, and it produces the evidence of text agreement that carrier registration within Stage 3.2 waits on.

Subjects: settings, communication dispatch system, Horizon tier, legal and compliance, legacy guard system.

Build Items:

- Its own page. The global navigation dropdown built within 4.3 carries its link.
- Account details: name, legal name, email address, phone number, and recovery email address. The name starts as the legal name and changes here. The email address receives every automated message. Each detail is editable. The email confirmation by link, the double verification on an email change, and the recovery email address's confirmation by link are built here. Settings within the Master Specification holds the rule.
- Password change and reset. Reset runs from the sign-in page through a link sent to the email address held within Settings, and it leaves through the Communication Dispatch System, so Supabase's own authentication emails stay off. A customer who has lost that address resets through the recovery email address, or through a code by text where they have agreed to texts, which opens once carrier registration clears.
- Account recovery, under the rule held within the Master Specification's Settings. The request from the sign-in page, its check for a browser that has signed in before, its seven-day wait with a notice to every address and number on file, and the thirty-day lock on the Begin button and account deletion are built here. 5.2 builds the Legacy Guard's recovery code.
- The text message switch and its disclosure. Turning it on requires a phone number on file. It records the agreement and sends the confirmation text. Email carries no switch. The switch reads the agreement record, so a STOP reply shows it as off. A number edited here starts its agreement over under the rule held within the Communication Dispatch System.
- Payment setup, through the payment form built within Stage 3.1.
- The automatic payments switch, on by default, controlling the renewal behavior built within Stage 3.1.
- Double verification, built once for every action that needs it: password re-entry and a confirmation code sent by email, or by text where the person has agreed to texts. Account deletion and the email change use it here. The Begin button, the Legacy Guard confirmation, and Account Restoration reuse it.
- Account deletion, available through the Horizon and Planning Phases and confirmed by double verification. It follows the deletion convention above, so the event log stays. It issues any refund owed through the refund built within Stage 3.1 and sends the refund notice. Settings within the Master Specification holds the rule. Stage 6.4 adds the Page handback.
- Later insertion: the delivery window, waiting within the Build Queue for the Operational Dashboard stage.

### STAGE 4.3 — User Profiles

Status: designed.

Every later sub-stage inserts its panels into it, and the plans and cart it builds are what the rest of Stage 4 builds against.

Subjects: user profiles, plan year system, calendar system, subscription tiers, Horizon tier, purchases, custom plans and posterity grace, key terms, legal and compliance.

#### Layout

The build produces the shell and the panels this sub-stage owns, and the User Profiles section within the Master Specification places them. Styling follows the Website Design Standards, and the Design stage refines it.

Build Items:

- The logged-in home, replacing the existing Dashboard page and reached from Account within the global navigation dropdown. The dropdown carries Account, Add a plan, Purchases, and Settings, and 5.1 adds the Legacy Guard portal link.
- The four tabs: Plans, People, Social Media, and Account. Each later insertion lands within the tab the Master Specification names for it.
- The strip across the top of every tab, carrying the phase display and the place for the check-in button, which 4.8 inserts.
- The phase display, reading the account status check.
- The place for the Account Restoration banner at the top of every tab.
- The empty spaces later sub-stages fill.

#### Plans and Cart

Build Items:

- Plan records carrying tier, plan year, delivery time zone, allowances, Additional Recipient slots, payment status, and a Custom plan's price. A Grace plan takes its preset, and each Custom plan takes its admin-set parameters.
- Plan Selection on the year calendar, with year arrows, the plan year list, and manual year input. Each year shows its plan, tier, and status, and skipped years carry the storage fee notice.
- Add a plan, which places a new plan with its tier.
- Plan options, each feeding the cart: skipped years before the plan, Additional Recipient slots, delivery time zone, a change of tier with its confirmation on a downgrade, and deletion with its confirmation. The time zone defaults to the browser's and locks at Interlude. The fit check on a change of tier arrives with the delivery count within 4.5. A change of tier or a deletion on a paid plan follows the rule held within Plan Selection in the Master Specification. A downgrade or deletion issues any refund owed through the refund built within Stage 3.1 and sends the refund notice. Deleting the last funded plan writes the account's return to the Horizon Phase.
- The live cart, holding plans being built with their Additional Recipient slots and skipped-year storage fees, and the storage fee as its own line with the next payment date. Plans pay one at a time or together, each carrying its inclusions. Checkout runs through the payment form built within Stage 3.1 and adds the storage fee wherever it is not current. The first plan paid initiates the account. Its placement and persistence across sessions follow User Profiles within the Master Specification.
- Grace selection with its hardship request, recorded for the Operational Dashboard stage to show staff. No Grace plan is placed until approval. The approval and decline actions are built here for that stage to call. Approval places one Grace plan year and initiates the account. Storage moves to Grace Storage with it. Each action sends the customer its notice. The Grace plan limit is held within Custom Plans and Posterity Grace.
- Custom plans, placed into the cart once an admin sets their parameters and closed to building until paid. The manual input panel belongs to the Operational Dashboard stage.

#### Purchases

Purchases is its own page reached from the global navigation dropdown, and the Master Specification's Purchases section describes it. It reads the payment records Stage 3.1 writes and the plan records built here.

Build Items:

- The Held and Applied groups, and the storage standing read from the account status check.
- Additional Recipient slots, storage years paid in advance, and Reprise years paid in advance, each added from here to the cart. The storage years control carries the statement held within Purchases in the Master Specification.

### STAGE 4.4 — Video and Image Systems

Status: designed.

The Content Builder uploads through it and calls its checks. Building it ahead of 4.5 leaves the builder nothing to stand in for.

Subjects: video and image storage and compression, video and content delivery, the content builder, social media integration.

Build Items:

- Validation at upload, rejecting on size, format, resolution, or length with a specific message built within the surface. Accepted formats, the HEIC conversion, and the compressed output all follow Video and Image Storage and Compression. Any other format is rejected.
- Video compression within the browser through FFmpeg.wasm, with the minimum resolution and the length limit at the upload surface. The size ceiling is built in order: measure compression time at the provisional ceiling on a representative machine, confirm or move the ceiling from that measurement, then reject files over it. A file still over its limit after compression is rejected.
- Image compression through compressorjs, running only on an image over the limit and correcting that image's orientation. Every other image is saved as uploaded, and a GIF over the limit is rejected.
- Storage within Supabase Storage, with each file tied to its piece and account.
- The July legacy-media bucket, brought in line with Video and Image Storage and Compression. It caps every file at 25 MB today and accepts WebP and HEIF but not GIF. A bucket holds one cap for every file, so the image limit is checked on the server.
- Supabase stays on the Free plan through the build, so the migration sets the bucket's cap at the Free plan's limit of 50 MB. The project moves to Pro before the first customer subscribes, and the bucket then takes the confirmed ceiling. Full-size uploads are tested once it does.
- Short-lived signed links, drawn each time a stored file is read.

#### Detection

Sightengine runs both checks under the rule held within Social Media Integration. Frames for videos and GIFs are pulled within the browser at upload and pass through the server, which holds the Sightengine credentials. They are stored with the piece, so the commit check reads the frames pulled at upload. Advisory or blocking is a stored setting, and so is the frame rate.

Build Items:

- The nudity scan at upload.
- The Community Standards check the Delivery Builder calls when a social media entry commits.
- Both stay advisory until tested against real content, and become blocking once they have.

### STAGE 4.5 — Content Builder and Delivery System

Status: designed.

Pieces are built into the plans User Profiles creates and uploaded through the pipeline before it. What it builds is delivered within 4.7 and previewed within 4.9.

Subjects: the content builder, the Delivery System document, subscription tiers, calendar system, video and content delivery, user profiles, legacy completion moment, communication dispatch system, social media integration.

#### Content Builder

Build Items:

- The window, which opens on top of the application without closing the page beneath it. It minimizes to a right-aligned tab at the bottom.
- Select a plan, offering only plans open for building that hold the allowance and Additional Recipient slots the piece needs.
- Upload through the pipeline built within 4.4, with one photo, GIF, or video per piece beside its message, and the metadata generated for it.
- Title, delivery date, and the Include in Posterity toggle with its delivery instruction field. The delivery date offers February 29 under the rule held within the Calendar System. A phone entry whose message will arrive as a link carries the notice held within Video and Content Delivery.
- The content calendar, built once as a single component shown here and within Plan Content.
- Draft and finalized states and lock status shown on each piece, under the finalization rule and warning held within the Content Builder section. Building opens and closes with the account status check.
- The delivery count, built once and used by everything after it. It holds each plan's remaining Standard, Feature, and social media allowances and its Additional Recipient slots. A social media post draws on two allowances, and unused Feature Deliveries serve as Standard Deliveries. It leaves out pieces marked as sent through Account Restoration.

#### Delivery System

Build Items:

- The Delivery Builder and Delivery Path, as the Delivery System document describes them. This includes the Social Gate hold, the phone number filter, and no + new recipient under phone number.
- Social media appears as a method only on an account whose Page 6.2 has verified.
- A social media entry calls the Community Standards check from 4.4 when it commits.

#### Saved Recipients and Master Recipient

Build Items:

- Saved Recipients, with an email address required on every entry. Each phone number carries its status, and invitations go singly or in bulk, with the confirmation step before they send. A text agreement belongs to the number, so each number's status reads this account's own invitation. One customer therefore never learns that another account saved it. The build includes the agreement page and the notice to the customer when a recipient stops. A number edited within Posterity starts its agreement over under the rule held within the Communication Dispatch System. Editing a Saved Recipient and deleting one in use follow the rule held within the Delivery System document's Saved Recipients.
- The Master Recipient, with its confirmation link, resend, and pending status. A confirmed Master Recipient joins Saved Recipients and satisfies the Social Gate across the account. Removing one that social media entries rely on follows the rule held within the Delivery System document's Social Gate.

#### Legacy Completion Moment

Build Items:

- Detects the first time every available post across the account's initiated plans is finalized, reading the delivery count. Every available post means the Standard and Feature Deliveries of those plans, since the social media allowance is drawn from within them. It then sends the founder message by email. The screen takeover waits within the Build Queue for the Design stage.

#### Handwritten Note

Build Items:

- The note's slot beside the piece's photo, GIF, or video. Every note, photographed or drawn on screen, passes through the pipeline built within 4.4.
- The on-screen canvas with undo and clear. It takes touch or a mouse and saves the note as an image.
- The notice on a piece carrying a social media entry, since a social media post goes without its note.

#### User Profiles Insertions

Build Items:

- Plan Content, the Saved Recipients section, the Master Recipient, and the button that opens the Content Builder.
- The fit check on a change of tier within Plan Selection.

### STAGE 4.6 — Legacy Guard Setup

Status: designed.

Its panel sits within User Profiles and its invitations leave through the Communication Dispatch System. The account lifecycle and the Check-in System after it both notify the Legacy Guards it records.

Subjects: legacy guard system, user profiles, communication dispatch system.

Build Items:

- The record: a label, an email address the customer confirms before anything sends, phone number, and order, with the first added as primary. It also holds payment authority (off by default, with its disclaimer), the personal note and delivery instructions, and a status of invited, accepted, or declined. The order changes by dragging, and the primary is the first in order who has not declined.
- The setup panel, inserted into User Profiles, with the recommended onboarding message beside it and Add Legacy Guard at the end of the list. The list shows each Legacy Guard by label, with their legal name beside it once they accept, and each opens to its own page. A note starts from an existing note, the template, or blank fields. Where more than one note exists, the first is offered by default. Removing a Legacy Guard ends their resends and sends them the removal notice, and 5.1 deletes their Legacy Guard login. An edited email address is confirmed like a new one. An invitation not yet accepted then goes again to it, and the earlier invitation's links stop working. Setup locks at Interlude through the account status check. Invitation resends continue after the lock.
- The invitation, carrying the note in its current form, with its unique first message and its six-month resends. It carries a decline link, and the customer can resend it from setup. Each resend comes with a reminder to the customer. Declining ends the resends and notifies the customer. A declined Legacy Guard stays listed until removed, and the customer can send the invitation again.
- Acceptance, the customer's notice of it, and the text message switch belong to 5.1. The manual resend belongs to the Operational Dashboard stage.

### STAGE 4.7 — Account Lifecycle and Delivery Automation

Status: designed.

It moves the accounts and delivers the content everything before it builds, and the Check-in System after it calls its trigger.

Subjects: account lifecycle and phases, key terms, plan year system, calendar system, Horizon tier, storage lapse grace period, check-in system, legacy guard system, user profiles, video and content delivery, the Delivery System document, purchases, legal and compliance.

#### Account Trigger

Build Items:

- One trigger with four callers: the missed check-in sequence, the Begin button, a Legacy Guard confirmation left unanswered for a month, and the first plan a Legacy Guard funds on an account held for funding. 5.4 builds the last. It fires only on an initiated account. It carries only the account's funded plans forward under the rule held within Key Terms.
- Firing moves the account into Interlude and locks content in its latest state. It ends the storage subscription along with any storage years still unused, and it ends any storage lapse sequence. It also records what storage remains unpaid and tells Legacy Guards holding payment authority. Storage Lapse Grace Period holds that rule.
- User Profiles insertion: the Begin button. It shows only on an initiated account and is confirmed by double verification. It carries its explanation and the list held within the Begin button bullet of User Profiles in the Master Specification.

#### Account Restoration

Build Items:

- The return to the Planning Phase for a trigger fired on Silence, under the rule held within the Master Specification's Check-in System. It opens at the trigger and closes at Reprise entry. Double verification confirms it.
- The storage subscription resumed with the time it held at the trigger, and the check-in clock restarted from that day. A storage lapse sequence running at the trigger resumes where it stood, with the time it held.
- The sent mark on each delivered piece, inserted into the Content Builder with the customer's choice to send the piece again. Each sent piece returns to its plan's allowance.
- The notice to every Legacy Guard, with staff notified through the event log.
- User Profiles insertion: the Account Restoration option and its banner.
- A request to remove a published social media post becomes a staff task, and 6.3 builds the removal.
- The fund reversal waits within the Build Queue for the Operational Dashboard stage.

#### Activation and Delivery

Build Items:

- January 1 activation, with Interlude extending through skipped initial years, and the yearly schedule generated each January 1. Schedule generation places a February 29 date under the rule held within the Calendar System. Each plan year's start is recorded for the fund release waiting within the Build Queue. Schedule generation leaves out any piece missing its Primary Recipient or delivery date, under the rule held within the Content Builder section.
- The daily check for what is due. Automated deliveries go at noon in each plan's time zone, and manual deliveries are allowed from six in the morning. Every time is stored against one universal time.
- Sending several deliveries at once. Video reaches email and text as a link to the delivery page. An image or a handwritten note reaches email as an attachment. By text each goes as a picture message and falls back to a link. A message too long for a text arrives as a link under the rule held within Video and Content Delivery. Each recipient gets their own link to the delivery page.
- Failed deliveries reroute through Alternative Recipients and then the Master Recipient, under Capacity and Delivery Order within the Delivery System document. Every attempt and outcome is logged by piece.
- Social media deliveries publish through 6.3.

#### Delivery Page

Build Items:

- The page every recipient link opens, as Video and Content Delivery describes it. Each recipient's link stays active for 90 days.
- The one new link an expired page offers.

#### Storage and Payment Notices

Build Items:

- The storage lapse sequence, for both starting conditions: a lapse recorded by Stage 3.1, and a trial's end. Its cadence, labels, and reminders to payment-authority Legacy Guards are held within Storage Lapse Grace Period. Building locks after three months through the account status check, and every notice before the lock states the date it takes effect. When the year ends, a Horizon Phase account is deleted once its final notice is sent and recorded. A Planning Phase account instead has its unpaid storage added to the cart, and a staff contact task is recorded for the Operational Dashboard stage. Storage Lapse Grace Period holds both rules.
- The notice seven days before a trial ends.
- Where automatic payments are off, the reminder thirty days before renewal and the payment request on the due date.

#### Reprise and the Posterity Transition

Build Items:

- Reprise entry on day one of the year after the final active plan year, with its first year free.
- The Posterity Transition check at the end of each Reprise year. Where no storage fee covers the year ahead, the account is tabled for deletion and a staff task records it. The task includes the Page where the customer elected deletion with the account.
- The Posterity Transition check counts every Reprise year paid for, whether bought ahead within Purchases or within the Legacy Guard portal.
- The Facebook Page checks at the start of each Reprise year belong to 6.4. The second legacy and the Legacy Guard Reprise sequence belong to 5.5.
- The route for an account never initiated belongs to 5.3 and 5.4, under the rule held within the Master Specification's Legacy Guard Portal.

### STAGE 4.8 — Check-in System

Status: designed.

It calls the Account Trigger built within 4.7 and notifies the Legacy Guards recorded within 4.6.

Subjects: check-in system, legacy guard system, communication dispatch system, user profiles.

Build Items:

- The six-month cycle from initiation, for Planning Phase accounts only. It continues through a storage lapse. The check-in request goes out on the due date, and the missed check-in sequence follows it under the rule held within the Check-in System.
- Check-in by button, by the one-tap link within each check-in email, and by text through Stage 3.4's inbound handling once carrier registration clears.
- The missed check-in sequence as the Check-in System section holds it. It goes to the customer and to Legacy Guards primary-first, with the acknowledgment link that keeps later notices with the primary Legacy Guard. No response through the sequence calls the Account Trigger, and the final notice confirms it has fired. Declined and removed Legacy Guards receive none of the sequence, and the primary follows the rule held within the Legacy Guard System.
- 5.3 builds the Legacy Guard confirmation, and a check-in during its month cancels it.
- User Profiles insertion: the check-in button within the strip, showing its confirmation, the next check-in date, and the reminder to review contact details.

### STAGE 4.9 — Preview Mode

Status: designed.

It previews what Stage 3.4 and 4.7 produce, and nothing after it waits on it.

Subjects: user profiles, onboarding, core values, video and content delivery, customer contact and communication.

Build Items:

- The Preview button on each piece, within the Content Builder and within Plan Content.
- One view for each channel the piece uses, shown on screen only. It is reachable during the Horizon and Planning Phases and locks at Interlude.
- Draft previews, so a piece can be previewed before it is finalized.
- Stage 6.3 adds the social media view.

# STAGES AFTER STAGE 4

Stages after Stage 4 are held within the Build Queue.

Link: [Posterity Roadmap Build Queue](https://docs.google.com/document/d/1QJYWiQ7QiWxb4dCdK-3D_5vOCfPus6-vm0qX79bli3w/edit?usp=sharing)
