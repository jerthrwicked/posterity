# POSTERITY

## Build Roadmap

This document is the living instruction manual for building Posterity. It carries every remaining build item in suggested build order. A working reference for the founder, for collaborators, and for the Claude Code instances that build from it. Completeness and accuracy come before presentation.

The Master Specification is the reference this file points at. The roadmap states what gets built and in what order. The specification states what the thing is and how it behaves. Where the two disagree, the specification wins and the roadmap is corrected. Every stage names the subjects its work is governed by. The builder searches the specification for them and reads what returns before writing anything, so the work begins from a body of material rather than from a task list alone.

Link: [Posterity Master Specification 9/12](https://docs.google.com/document/d/14OoN3GlzDnJjo0ll6hIN6pjU7nCEsWB2MA39R-jWhPY/edit?usp=sharing)

Design and writing work carried by the founder lives within a separate work order. Stages that wait on an item there say so.

Link: [Stage Zero - Founder Build Roadmap](https://docs.google.com/document/d/1YdA0yvA2-0Lxhvv06IcM8x7CG2HYl7lRm7ldr3EGUaM/edit?usp=sharing)

**Project Files**

Four artifacts carry this project's build record. Two are markdown files within the repository and hold the authority. Two are Google Docs, each a readable copy of one markdown file, and neither carries authority of its own.

Posterity_Build_Roadmap.md holds every remaining build item in suggested build order. Its readable copy is the Build Roadmap Doc.

Posterity_Build_Log.md holds the record of everything already built. Its readable copy is the Build Log Doc.

# How to Use This Document

Begin work by reading Current Status. This section describes where the project stands as a whole — what is current, what is open, and what blocks the build. It is rewritten when the picture changes rather than updated after each session. The record of what has been built lives within the Build Log.

Remaining work lives in suggested build order. Completed work moves to the Build Log, which is organized by category with the newest entry first within each. Nothing is ever removed from it, so the log carries the full history of the build. A build item carrying a status holds its place within its stage until it is built, and the status is dropped when it moves. A stage records no progress of its own. It persists for as long as any build item remains within it, and it is finished when its last build item moves to the Build Log.

Every stage covers one system and states its status in its opening line, written as the word Status followed by its value. A stage that carries sub-stages is the exception, and each of its sub-stages does both instead. A stage number carrying sub-stages beneath it groups them and holds no system of its own, and a status placed on it reaches every sub-stage within it. A heading within a stage groups build items inside that system rather than marking a separate one. A system large enough to stand on its own is given its own stage number.

A status applies to whatever carries it and to everything beneath it. Where a status halts progression, it reaches further, and it also stops everything after it that depends on what it sits on. Each stage opens by stating why it sits where it does, and that reasoning is what establishes the dependency. A stage that depends on nothing gated proceeds, and where that independence matters it is stated where the stage opens. A heading or a single build item carries its own status in the same form, written where it is named. Anything carrying no status of its own takes the status above it, so the nearest status always governs. Nothing is open to a builder unless it reads designed and nothing above it in the hierarchy carries another status. A status behaves the same way wherever it sits within the hierarchy, and its position sets how far it reaches rather than what it does. Status is set by the founder, or by co-founder where the situation allows. Halted is the exception, since it records what the build encountered rather than what was decided. Claude Code sets and clears the halted status, and whether the halt stops only what it sits on or everything beneath and after it is decided by the founder or co-founder. Following is a list of all status types within the roadmap.

Status types:

- Designed. Everything the stage, sub-stage, heading, or build item requires is designed in full. It is ready to be built.
- Requires input. Named issues or questions remain open on everything that carries this status. Further work can proceed unimpeded prior to its resolution.
- Requires input and gates progression. Named issues or questions remain open on everything that carries this status. Nothing beneath it proceeds prior to its resolution, and neither does anything after it that depends on it.
- Requires system design. The design itself remains outstanding on everything that carries this status. Nothing beneath it proceeds prior to its resolution, and neither does anything after it that depends on it.
- Halted. Work began and stopped against something outside whatever carries this status, and the cause is recorded alongside it. Whether further work can proceed is decided case by case.

All statuses maintain the ability to be shifted into another status if warranted. Resolutions of statuses, as well as any status shifts, must be appropriately maintained on progression.

User Profiles is a container rather than a feature. Stage 4.5 builds its shell and the panels that stage owns (added prior to Stage 4 roadmap creation). Every later stage that adds a panel carries a line reading User Profiles insertion, naming what it adds. No stage waits on another to touch it.

A stage number, once assigned, always points at the same system, since cross-references throughout the project depend on it. A system that earns its own number later takes the next decimal within the stage it sits in rather than forcing a renumber. The Master Specification carries no stage numbers, by design. Build order lives here and nowhere else.

# How to Manually Edit This Document

Claude Code edits this file as he builds. When a task is finished he removes it from its stage and writes it into the Build Log, so both files are edited every time something closes out. The roadmap is Posterity_Build_Roadmap.md and the log is Posterity_Build_Log.md, and neither is ever updated without the other. Build progress is the whole of his standing permission. Nothing else within either file changes without founder or co-founder approval, and he never edits the Master Specification or any other project document.

Every other change is authored within a Claude.ai session. New sections are drafted and worked through in conversation, and edits to existing text are delivered as find and replace pairs, each carrying the exact existing string, the exact string replacing it, and the expected replacement count. The founder executes those against the Google Doc as work proceeds and edits the Doc by hand alongside them. Claude reads the live Doc before writing anything, since the founder edits as the session runs and a string written against stale text will not match.

Work reaches Claude Code once the Doc carries the finished text. Claude compiles it into a prompt naming the file, the exact text, and its position stated as what it follows and what follows it. Claude Code writes it into the markdown and prints the section back rather than reporting that he wrote it, which surfaces a truncated or misplaced write while the work that produced it is still open.

The markdown is the record and every change reaches it directly, whether it is build progress Claude Code writes on his own or authored text handed to him. Nothing is ever written back into the markdown from the Doc. The Doc is refreshed by pasting the markdown over the existing document, since a new document carries a new file identifier and every link pointing at the roadmap would stop resolving. The refresh happens at the end of a session, and more often where a second builder is closing out work, since the Doc goes stale the moment anything is written into the markdown.

# Current Status

As of September 12, 2026.

The Master Specification is current. The Social Media Integration design record is complete and is the single authoritative copy of every rule within it. Posterity Social is complete in concept and awaits its own design pass. Every build-stage reference has been swept out of the Master Specification, so this file is the only place build order is recorded.

Nothing blocks the build. Stage 3.1 through Stage 3.4 are designed end to end and open now. Stage 4 onward is unwritten and is the next session's work. The payment model is decided: upfront pre-load with year-by-year release. No code has been written since the Claude Code transition, so the application stands where the June work left it.

# STAGE 3

### STAGE 3.1 — Stripe Integration

Status: designed.

Payment is the first thing the application needs and nothing else within the build depends on it, so it opens the sequence. Subjects: subscription tiers, the Horizon tier, plan years and skipped years, additional recipients, and the financial architecture.

#### Confirmation Before Any Change

Price IDs matching the current ladder may already exist within Stripe, created outside a working session and never confirmed or tested. Check the Stripe dashboard directly before any pricing work proceeds. Where an entry already matches the confirmed ladder, test it rather than replacing it.

#### Pricing and Products

- Update prices to the confirmed ladder: Basic $49, Premium $129, Legacy $399 per plan year
- Generate new Price IDs for each
- Update every Price ID within the codebase and the Vercel environment variables
- Test checkout for each tier after every Price ID change
- Horizon remains $9.99 per year, recurring. No change
- Create Posterity Grace Storage at $4.99 per year. Admin-assigned through a unique access code, no public checkout
- Create Posterity non-recurring storage charge at the same price as Horizon. It covers a skipped plan year and an additional Reprise year alike. Skipped years are added to the cart automatically and stack per year. Reprise years are purchased on demand, by the customer in advance or by a Legacy Guard during the phase, so the charge must be payable outside the plan selection flow as well as within it
- Create Additional Recipient slots, priced by tier: $5 on Basic, $12 on Premium, $25 on Legacy, writing the product description for each within Stripe. Alternative Recipients are fixed at two per piece of content across all tiers and are never purchasable
- Storage fees are payable in advance for any number of years a customer chooses

#### Stripe to Supabase

- Record the subscription within Supabase on every successful payment
- Webhook for subscription status changes
- Webhook ending the Horizon subscription when the account initiates
- Refunds through Stripe. Status: requires input. The refund policy is written and the mechanism is not — what the customer does, what staff do, what Stripe does, and what happens to the content. Carried within the founder work order
- The three-month free trial. Status: requires input. What happens once the trial expires is specified in full. What the trial attaches to, and what it grants while it runs, is not. Carried within the founder work order

#### PayPal

- Add PayPal through Stripe's native integration. No separate PayPal account or API
- Confirm PayPal carries recurring subscriptions, including Horizon at $9.99 per year
- Confirm the non-recurring storage charge completes through PayPal
- Dedicated sandbox testing before launch. Renewal reliability differs from card billing

#### Dashboard Access

- Lock the dashboard behind subscription tier
- Open intake at launch. No approval gating, cold traffic from day one

#### Site Consistency Sweep

Runs after the Stripe work, not before it. The live application carries content predating several confirmed decisions.

- Plan cards on both the homepage and the Plans page show the retired ladder of $99, $249, and $899
- Phase names on the homepage read Abeyance and Twilight. The confirmed names are Interlude and Reprise
- Plan card bullets count messages and video messages. The confirmed terminology is Standard Deliveries and Feature Deliveries
- Grace Storage does not appear
- Custom and Grace route to a mail link rather than a contact surface
- Get Started routing is untested against the updated products
- Various links contain incorrect or outdated material and some may be inactive

### STAGE 3.2 — Twilio

Status: designed.

Twilio carries every voice, SMS, and MMS path within the system. It is provisioned before the Communication Dispatch System, which sends through it.

Subjects: customer contact and communication, video and content delivery.

- Create the account and provision the Posterity phone number
- Enable voicemail
- Configure the number to capture inbound calls and voicemail for later routing. Inquiries, general questions, and Grace applications arrive here, and the Operational Dashboard turns them into tasks in a later stage
- Confirm SMS capability is configured and tested
- Confirm MMS capability is configured and tested, including the size ceiling per message

### STAGE 3.3 — Postmark

Status: designed.

Postmark carries every automated email the system sends. It is provisioned before the Communication Dispatch System, which sends through it. It does not depend on Twilio and neither stage blocks the other.

Subjects: customer contact and communication.

- Create the account on the free Developer tier, which carries the build at no cost
- Confirm sender authentication against *posterity.admin@gmail.com*, the existing account. Deliverability depends on it, and nothing else within the stage matters if mail does not arrive. A business address replaces it once a domain is secured, which is tabled within the specification
- Confirm the Posterity email account is fully configured. It is separate from Postmark and handles human correspondence rather than automated mail, answering inquiries and carrying replies
- Move to the Basic plan when the first customer subscribes. The free tier stops delivering at its cap rather than billing an overage, so this is a launch condition rather than a judgment

### STAGE 3.4 — The Communication Dispatch System

Status: designed.

The single path every automated message within Posterity takes on its way out. The system itself is specified in full within the Master Specification, and what is built here is the mechanism rather than any cascade that calls it. Social media is a third channel of the same system and is built within the Meta stage.

It is built in this early stage because the Check-in System and the delivery automation both call it, and both are built within Stage 4.3 and Stage 4.4 (added prior to Stage 4 roadmap creation). It depends on Twilio and Postmark, since both are the channels it sends through. Cascades are not built here. Each is built within the stage that owns its trigger, and each is a caller rather than a part of the Communication Dispatch System.

Subjects: the Communication Dispatch System, customer contact and communication, delivery, automation summary.

- A scheduler that wakes on a cycle and asks what is due
- A queue holding what the scheduler returns, so a failure retries rather than disappearing. A send that exhausts its retries is recorded as a failure for the Operational Dashboard to surface in a later stage
- A Postmark sender and a Twilio sender, each taking a message and a destination. Both are built as channels behind one interface, since Meta joins them as a third channel when social media publishing is built
- Channel policy applied at send: email is the universal baseline and always goes, and text message layers on wherever a phone number is on file and text notifications are enabled
- An event log recording every send by account and by outcome, so a delivery can be evidenced years later
- Message copy stored as a field the Communication Dispatch System reads rather than as text inside the trigger logic, so approved copy replaces placeholder copy as a content change rather than a code change
