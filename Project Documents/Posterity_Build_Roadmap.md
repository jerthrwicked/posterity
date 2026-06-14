# Posterity — Build Roadmap
Last updated: June 2026

This document contains every remaining build task for the Posterity project in sequential order. It is the authoritative source for what gets built, when, and in what order. Completed items are not kept here — they move to Posterity_Build_Log.md when finished. When this document and the context file (CONTEXT_for_posterity.md) conflict on task detail or order, this document wins. When they conflict on product decisions, the context file wins.

How to read this document: work top to bottom. Nothing in a later section should be started until everything above it that it depends on is complete. Brainstorm sessions listed before a stage must happen before that stage build begins — they inform decisions the build depends on. Horizon Builds are the exception and can be picked up independently at any time without disrupting the primary build sequence.

This document is updated at the end of every session by Claude Code, based on instructions authored by Claude.ai. Completed items are moved to Posterity_Build_Log.md at that time.

---

## CURRENT POSITION
Pre-build work order in progress. All stage builds are on hold until the work order is complete.

---

## PRE-BUILD WORK ORDER
Complete these items in sequence before any stage build resumes.

### Claude Code Setup
Claude Code (referred to as CC going forward) is the new execution layer for the Posterity project. It replaces the previous Cursor Agent prompt-relay workflow and the claude-cursor-bridge MCP system. CC runs inside the Cursor editor and handles all code execution, file operations, GitHub commits, and pushes autonomously. Jeremy remains the approval gate at every significant step. Claude.ai remains the sole planning and decision-making layer and the sole author of all context and document updates.

- Confirm the ANTHROPIC_API_KEY environment variable is cleared or disabled on Jeremy's system. If this variable is active, Claude Code will bill against Anthropic Console API credits rather than the existing Claude Max subscription.
- Install Claude Code and authenticate using existing Claude Max subscription credentials
- Install the Claude Code extension in Cursor
- Run the /init command in the project root to generate a starter CLAUDE.md file automatically
- Finalize CLAUDE.md with full Posterity project context — content authored by Claude.ai, Claude Code executes the file write only
- Test Claude Code on one low-stakes task in Plan Mode before trusting it with consequential work
- Evaluate the claude-cursor-bridge MCP server for retirement — Claude Code replaces its core function
- If confirmed redundant: retire posterity-mcp/index.mjs and remove claude-cursor-bridge from mcp.json
- If the bridge is retired: confirm whether the Anthropic Console API credit account can be closed
- Keep Cursor Pro+ subscription active until Claude Code is confirmed working efficiently — do not cancel until that confirmation is made

### MCP Path Audit and Repair
- Audit all active MCP servers: filesystem, Google Docs, GitHub, claude-cursor-bridge, Stripe, Supabase
- Confirm all paths in mcp.json point to correct and current file locations
- Verify that sync-context.js and mcp.json both reference the same single CONTEXT_for_posterity.md file path
- Resolve the Google Docs MCP issue where only approximately 1 kilobyte writes through instead of the full context
- Enable live context editing through Claude in Chrome once MCP is confirmed working
- Decide whether npm run sync should write to OneDrive automatically or remain a manual step

### Work Order Item 1 — Stylized PDF Cover Corrections
- Correct cover hero text to 96px
- Correct cover background to full bleed black with no grey — fix via margin: -32px -32px 0 -32px on the .cover-page element
- Visual verification required via the Project Documents folder after each run
- Correction prompt is already written and ready to paste into Claude Code

### Work Order Item 2 — Lock PDF Design Rules
- Confirm all future PDFs match the stylized PDF final design parameters documented in the PDF Design Standards section of the context
- Plain context PDF and CONTEXT_for_posterity.md are structurally frozen permanently — never restyled or restructured
- Rule active: the word "context" always refers to CONTEXT_for_posterity.md in every scenario without exception

### Work Order Item 3 — Living Instruction File and CLAUDE.md
- CLAUDE.md functions as the living instruction file for Claude Code — read automatically at the start of every Claude Code session
- CLAUDE.md is authored by Claude.ai and updated as part of the end of session flow
- Finalize the update process for CLAUDE.md so it stays current alongside the context file on every sync
- Structure and final content confirmed during the Claude Code setup session

### Work Order Item 4 — Bridge Documentation PDF
- Markdown source already exists at Project Documents/Priority_Zero_Bridge_Documentation.md
- Styled PDF generation is pending until the stylized PDF cover corrections in Work Order Item 1 are confirmed correct
- Cover hero text: "The Bridge." — style must match Layout A of the stylized context PDF

### Work Order Item 5 — Creative Alignment Pass
- Work through the full context until every section matches the founder's vision
- The Core Values section has been identified as reading with an AI-generated voice — rewrite in the founder's voice during this pass
- Any section that reads as generated rather than authored gets flagged and rewritten with founder input before this item is closed

### Work Order Item 6 — Legal Preparation Package
- Copyright research: what qualifies for protection in Posterity, what to file now versus later, registration process and cost
- Patent research: whether the automation system, trigger logic, and check-in workflow constitute patentable process intellectual property — patent application summary document to be written
- Full consultation prep package compiled and ready to bring to a lawyer
- Research PDF package: multiple styled PDFs summarizing research across all legal topic areas
- Key open questions: whether to file copyright now or wait until the product is more complete; whether a patent application is warranted and on what specifically

---

## DEDICATED BRAINSTORM SESSIONS
These sessions must happen before the stage builds they inform. Each is listed with what it must precede.

**Terminal orientation session** — Before Claude Code setup. Jeremy needs a working understanding of what the terminal is and what Claude Code is doing inside it before handing execution authority to an autonomous agent.

**File organization session** — Before Claude Code setup. Audit and map every file in the project, clarify the role of each, and establish naming conventions so there is never ambiguity about which file is canonical.

**Context condensation strategy** — Before the context grows large enough to cause quality issues. Evaluate which sections can be moved to linked external documents while keeping a plain-language summary and a live link in the context. The Collaboration System section is the first candidate.

**Payment architecture brainstorm** — Before Stage 5 financial build. Two models are under consideration: customers pre-load the full balance upfront with funds held in the Posterity Legacy Fund and released annually as plan years activate; or customers are billed each January 1 as each plan year begins. Full ramifications including customer trust signal, refund obligations, legal posture, cash flow, and marketing implications must be settled before any financial infrastructure is built.

**Notification system full design** — Before any notification-related build work. Covers: admin dashboard inbound communication surfacing, customer-facing notification user interface, opt-in and opt-out controls, and channel priority logic.

**Trusted contact payment authority brainstorm** — Before the Stage 3 Stripe non-recurring storage build. The trusted contact needs the ability to pay the non-recurring storage fee in two scenarios: maintaining an account transferred to the Posterity Phase, and covering a plan year the customer skipped. Terminology, flow, and Stripe implementation must be settled before building.

**Trusted contact plan-funding authority for unfinished accounts** — Before the Stage 4 trusted contact system build. A customer can reach the end of their life during the Horizon Phase before any plan is funded. The trusted contact needs the ability to fund plans on the customer's behalf. Requires defining a second trigger type, consent flow, payment authority, and phase routing logic.

**Creativity gauge and auto-promotion calculator** — Before Stage 5 collaboration system build. Research whether an auto-promotion calculator is already documented in the context. If not, add it as a subsection beneath the creativity gauge in the Collaboration System. Brainstorm how the creativity gauge versus productivity ratio feeds into automatic role promotion.

**Google Workspace business email evaluation** — Before launch. Evaluate replacing posterity.admin@gmail.com with a professional business email address. No action until the domain name is finalized.

**Cursor and Claude team subscription evaluation** — When the first collaborator joins. Evaluate whether team plans reduce total cost. No action until a collaborator is active.

**Financial architecture legal review** — Before Stage 5 financial build. Lawyer input required before any financial automation is built. Formal escrow language review also required at Stage 6.

---

## STAGE 3 — Stripe Integration
Current stage. Tabled until the pre-build work order above is complete.

### Pricing and Products
- Update Stripe prices to locked pricing: Basic $99/year, Premium $249/year, Legacy $899/year
- Generate new Price IDs for Basic, Premium, and Legacy after price updates
- Update all new Price IDs in the codebase and Vercel environment variables
- Test checkout for each tier after every Price ID update
- Create Posterity Grace Storage product at $4.99/year — admin assigned via unique access code, no public checkout
- Create Posterity Skip-Year Storage as a non-recurring charge — auto-added to checkout cart per skipped plan year, stacking per additional skipped year
- Add Limited Availability badge to the Legacy plan card

### Stripe to Supabase Connection
- Record subscription in Supabase on every successful payment
- Webhook for subscription status changes
- Horizon auto-cancel webhook that fires when an account upgrades to a paid plan

### PayPal Integration
- Add PayPal as a payment method via Stripe's native PayPal integration — no separate PayPal account or API needed
- Confirm PayPal supports recurring subscriptions including Horizon $9.99/year
- Dedicated PayPal sandbox testing before launch — renewal reliability differs from card billing
- Confirm non-recurring storage charge works correctly via PayPal

### Dashboard Access
- Lock the dashboard behind subscription tiers
- Open intake confirmed — no approval gating at launch, cold traffic from day one

---

## STAGE 4 — User Profiles, Content Builder, and Core Customer Systems

### User Profiles
- Year-based calendar setup — customers set real calendar dates tied to plan years
- Social media connection via Meta Business API and unique Posterity-generated backup credentials — required for all accounts
- Two-factor authentication configured using Posterity-controlled contact details
- Video, photo, and message upload with FFmpeg.wasm client-side compression
- Previews of all uploaded content within each plan's building dashboard
- Live cart top right of dashboard — total cost, storage fee line item, next payment date. Real-time updates, persists across sessions.
- Plan deletion with permanent-action confirmation dialog
- Payment setup supporting card and PayPal via Stripe
- Account phase clearly displayed in dashboard at all times
- Trusted contact setup — name and email entry, invitation sent automatically, customer notified on acceptance
- Check-in preferences — both email and SMS recommended
- Check-in confirmation button — resets the 6-month clock on press, displays next check-in date
- Content builder access point
- Test and preview mode — customer sees exactly how each piece will deliver, platform by platform
- Plan year status overview — configured, scheduled, paid, or skipped
- Notification settings — opt in and out by message type and channel
- Remaining messages and videos ticker
- Multi-plan side menu — create and work on multiple plans simultaneously
- Add Plan button — visible at all times, darker shade during Planning Phase, routes to cart during Planning Phase with automated explanation message
- "I'm Ready" button with explanation text and double verification requirement
- Automated admin notifications on all applicable triggers — see Admin and Operations section of context for full trigger list

### Content Creation Portal
- File upload for video, photo, and message
- Auto-generated metadata at upload: file type, creation date, post date, delivery method, target platform
- Visual snapshot auto-generated at upload: first frame of video, image thumbnail, or message preview
- Option to choose frame manually or generate thumbnail
- Delivery configuration per piece: recipient, platform, post date
- Include in Posterity toggle on every content item
- All metadata stored as Supabase record linked to delivery automation
- Plan year selector before adding content
- Recipient input per piece pulled from saved recipient master list
- Recipient master list — add once, reuse across pieces and plans
- Handwritten note attachment per message — paid plans only
- Delivery method per piece — social platform, email, or SMS chosen independently
- Schedule preview — calendar view within selected plan year
- Draft versus scheduled state distinction
- Edit window — fully editable until account enters Abeyance, then locked. Lock status displayed clearly.
- Validation on upload — automatic rejection with specific error on size, format, or length failure

### Video Systems
- FFmpeg.wasm client-side compression at point of upload
- Hard limits enforced: 25 megabytes maximum, 720p minimum, 3 to 4 minutes maximum
- System rejects upload with clear error if file exceeds 25 megabytes after compression
- Twilio MMS delivery for files under 25 megabytes
- Secure link fallback via Twilio SMS if MMS carrier delivery fails
- Contract and user profile disclaimer for MMS fallback
- Unused video slots roll over to message slots

### Check-in System
- 6-month check-in cycle via email, SMS, or in-app button
- Missed check-in triggers escalating notification sequence: unique first notification, 2 per month for 3 months sequence-labeled, unique final notification confirming non-response trigger has fired
- All notifications sent to customer and all trusted contacts simultaneously
- Non-response event auto-generated after all 6 notifications go unanswered
- Account moves into Abeyance automatically

### Trusted Contact System
- Multiple trusted contacts supported — strongly recommended for long-timeframe accounts
- Primary trusted contact receives all notifications during first month only
- All contacts receive remaining notifications if primary does not respond
- Unique first invitation message per trusted contact explaining role and next steps
- Invitation resent automatically every 6 months until accepted, sequence-labeled. Manual resend available from admin dashboard.
- Customer notified when trusted contact accepts invitation
- Trusted contact portal — separate login, independent from customer account
- Portal shows: role, linked customer, notification history, confirmation button
- Confirmation requires double verification — password re-entry plus confirmation code
- Personal note from customer surfaced to trusted contact at confirmation time
- If no trusted contact ever confirms: non-response system handles account progression independently

### Onboarding and Walkthrough
Deferred. Cannot be finalized until Content Builder, User Profiles, and all delivery systems are complete. Revisit before Stage 4 build begins.
- Step-by-step walkthrough on first login
- All six account phases explained
- Onboarding FAQ with option to replay walkthrough
- AI chatbot for guidance and questions
- Test and preview mode entry point
- Grace plan details in FAQ only — not in main flow
- Early Posterity Phase planning strongly recommended

### Meta Business API and Buffer Integration
- Meta Business API connection for Facebook and Instagram
- Buffer used by Posterity team post activation to post content
- Direct platform login as fallback
- Per-customer unique backup credentials stored securely in Supabase
- Two-factor authentication using Posterity-controlled backup email or Twilio phone number
- Facebook Memories feature deferred

### Multi-Year Cart System
- All plans auto-added to cart
- Storage fees for skipped years auto-added per skip, stacking
- Full upfront payment of all plans and storage fees at initiation
- Final payment model to be confirmed during payment architecture brainstorm before build

---

## STAGE 5 — Admin Dashboard, Operations, and Financial Automation

### Operational Dashboard
- All tasks in priority order — auto-generated from delivery events and manually creatable
- Task fields: label, description, file type, delivery method, social platform, post date, creation date, priority level, target completion date, visual snapshot
- Admin calendar view across all dates
- Push back options: 1 day, bottom of list, manual date selection
- Tasks unassigned by default — any staff member can claim
- Assignment toggle controlled by Director level
- Claimed tasks locked to that staff member until complete or reassigned

### Pay Per Task System
- On and off toggle — Director level only
- Tracks tasks completed per staff member
- Video tasks weighted higher than text — mirrors 2x operational unit weight
- Used for part-time and casual staff pay calculation

### Admin Access Tiers
- Director — full access including financial dashboard
- Manager — full operational access, no financial dashboard
- Staff — content posting and customer inquiries only
- Multiple profiles at each level

### Financial Dashboard
- Director only — completely separate from operational dashboard
- No employee access to funds — audit logs only
- Automated year-by-year fund release via server-side cron job each January 1
- Mercury Bank two-account architecture: Posterity Legacy Fund holds customer funds, Operating Account receives annual transfers as plan years activate
- Immediate admin alert for any automation failure: what failed, which customer, amount, timestamp, retry status
- Full audit trail for every transfer
- Lawyer review required before this section is built

### Grace and Custom Account Management
- Manual input panel for Grace and Custom account setup
- Grace access code generation system
- Admin initiates Grace accounts after consultation
- Custom parameters set by admin first, customer builds after

### Post Delivery Systems
- Post Manually override button
- Simultaneous post processing
- Twilio voicemail notifications
- Posterity email account for video delivery via link and customer email inquiries
- Audit logs for all financial movements
- Test account option post-launch
- Standing task: monitor Meta Business API announcements

### Automated Admin Notifications
Full notification system design session required before this section is built. Known triggers documented in Admin and Operations section of context.

---

## STAGE 6 — Design, Legal Finalization, Marketing, and Launch Preparation

### App Design and Visual Polish
- Full app appearance fine-tuning against locked design standards
- Logo design — Claude first, Canva as backup
- Legacy Completion Moment full build: 20-second color transition, unique in-app notification, simultaneous founder email

### Legal and Compliance
- Formal Terms of Service — lawyer review required
- Copyright application
- Liability FAQ and Standards of Use FAQ
- Refund policy finalization
- Service time limit legal documentation — 5 years guaranteed, unlimited at best effort — lawyer input needed
- Formal escrow language — lawyer review required
- Tax compliance — evaluate TaxJar or Avalara bolt-on to Stripe. No action until Stage 6.

### Marketing and Investor Materials
- Sales sheet
- Investor growth projections and break-even analysis by customer numbers
- Testimonials section — build after accruing real customer content
- Life insurance company partnership exploration
- Evaluate expanding beyond Facebook and Instagram as demand grows
- Pricing review once social media login time per post is accurately measured — current pricing locked for Stage 3, any re-pricing after review is a Stripe Price ID swap only

---

## HORIZON BUILDS
Creative pipeline. Any item here can be picked up independently at any time without disrupting the primary build sequence. When an item graduates into a confirmed stage, it moves to the roadmap at the next context update.

- Dependency tree visual document — a visual map of all build items with color-coded arrows showing dependencies
- Collaboration MCP suite — tier calculator, contribution point tracker, notification pusher, Posterity ID generator
- Simultaneous session detection
- Creativity gauge full build — planned for Stage 5 or later
- Multiple recipients add-on — tiered: 2 to 5 recipients, 5 to 10, unlimited
- Context growth rate management — summary MCP for Google Docs consolidation
- Domain name purchase — posterity.co is taken, research posterity.app, posteritylegacy.com, and alternatives
- Auto-update remaining sessions and hours on each sync based on completed items
- Reformat all section PDFs to app visual style — sage, dusk, Geist, Lora italic, black canvas
- Stylized PDF auto-edit MCP — extend claude-cursor-bridge with generate_stylized_pdf, verify_pdf_visual, and read_layout_context tools
- Notification system full design — dedicated brainstorm required before any build work
- Auto-promotion calculator — how the creativity gauge versus productivity ratio triggers automatic role promotion. Check context first — add as subsection beneath creativity gauge in Collaboration System if not already documented.
