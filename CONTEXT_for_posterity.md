# Posterity - Project Context

## Project Status
🟢 Context current | Last sync: June 6, 2026 | Version: 1
👤 Main Builder: Jeremy Grego | Contributors: None active
⚠️ No pending notifications
📊 Context size: [100%] ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

---

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after they are gone. A digital time capsule with a subscription model. Posterity posts content on behalf of customers to their chosen delivery platforms after account activation.

---

## Subscription Tiers (LOCKED June 2026)
| Tier | Price | Messages | Video |
|------|-------|----------|-------|
| Horizon | $9.99/year | None | None |
| Basic | $99/year | 4 per year (quarterly) | 1 per year |
| Premium | $249/year | 12 per year (monthly) | 4 per year |
| Legacy | $899/year | 52 per year (weekly) | 12 per year |
| Custom | Contact Us | Custom | Custom |
| Grace | Contact Us | 1-2 messages | None |
| Grace Storage | $4.99/year | None | None |

All message tiers include optional handwritten note per message.
Videos weighted at 2x a text message unit (operational cost rationale — do NOT display on pricing cards, include in user manual only).
Plan names on site/customer-facing materials: Horizon, Basic, Premium, Legacy, Custom, Grace.
Plan names in Stripe only: Posterity Horizon, Posterity Basic, Posterity Premium, Posterity Legacy, Posterity Grace.

---

## Account Lifecycle & Phases
Posterity accounts move through six distinct phases, in sequence. It is important to understand that only accounts shift phases. Plans exist within accounts and move alongside them — plans do not independently progress between phases. Think of the account as the container and the plans as its contents. When the account moves forward, everything within it moves with it.

This language appears throughout the product, the onboarding walkthrough, and all customer-facing materials. It is a core part of what makes Posterity unique — clinical terminology is removed entirely. The system responds only to events and dates, never to the customer's passing itself.

**Key Terms:**
- **Initiated** — an account that has been funded by paying for the plan(s) within it. All plans within the account are fully funded. Upon initiation, the account enters the Planning Phase and the check-in system begins.
- **Non-response trigger** *(internal term only)* — the system event that moves an account into Abeyance. Occurs in one of three ways:
  1. All check-in notifications go unanswered and a non-response event is automatically generated
  2. Trusted contact confirms identity and submits confirmation through their portal
  3. Customer manually moves their account into Abeyance using the "I'm Ready" option
  The system responds only to events — never to the customer's passing itself.
- **Abeyance** — the intentional waiting period between the non-response trigger and account activation. Content is ready but not yet delivered. The bereaved are given time to process their loss.
- **Active** — the account is delivering content according to the customer's calendar. Activation occurs automatically on January 1 following the account entering Abeyance.
- **Twilight** — neutral phase following completion of the final Active plan year. First year is free. No storage fee during the free year. Trusted contacts are notified. Most use this year to download and share content before deciding on paid storage.
- **Posterity** — the account has been transferred to the trusted contact. It lives as a permanent archive of the delivered legacy. Trusted contact takes over storage at $9.99/year. Accounts that do not enter Posterity cease to exist after the free Twilight year ends.

**The Six Phases:**

*Phase 1 — Horizon (Building Phase)*
The customer has subscribed to Horizon at $9.99/year. They are actively building their legacy — uploading content, setting up their calendar, and selecting the plan tiers they intend to include in their account. Multiple plans can be built and worked on simultaneously via a side menu in the dashboard. There is no time limit on this phase. The Horizon subscription covers storage for as long as the customer remains in this phase.

*Phase 2 — Planning Phase (Post-Initiation)*
The customer has funded their account by paying for their plan(s). Plans now exist, are funded, and content continues to be refined. The customer continues their regular 6-month check-ins. This is typically the longest phase — it lasts from the moment an account is initiated until the non-response trigger fires or the customer manually moves their account into Abeyance, potentially spanning years or decades.

*Phase 3 — Abeyance*
A trigger event has occurred — either the non-response trigger has fired or the customer has manually moved their account into Abeyance using the I'm Ready feature. The account is now in a waiting state. No content is delivered during this phase. This is intentionally brief — lasting until the following January 1, a maximum of approximately 11 months. This grace period reflects one of Posterity's core values: the bereaved deserve time to process before their loved one's account enters its Active Phase.

*Phase 4 — Active Phase*
January 1 has arrived. Content delivery begins according to the customer's calendar. The system automatically generates that year's delivery schedule and posts content on the dates the customer set. This phase repeats annually for each plan year initiated.

*Phase 5 — Twilight*
The final Active plan year is complete. The account enters a neutral waiting state. The first year of Twilight is free — no storage fee. All trusted contacts are notified. Most trusted contacts use this year to download and share content before deciding whether to transition the account into Posterity with paid storage. Some accounts end here.

*Phase 6 — Posterity Phase*
Triggered when the trusted contact logs into their portal, confirms identity through double verification, and accepts the transfer. The dashboard becomes a clean archive — photo album style, no editing. The trusted contact takes over storage at $9.99/year to keep the account live beyond the free Twilight year. Accounts that enter Posterity can live on indefinitely. Accounts that do not enter Posterity cease to exist after the free Twilight year ends.

Posterity Phase features:
- "Include in Posterity" toggle on every content item during creation
- Optional second legacy buildable within the Posterity Phase
- "Add custom Posterity recipient" button
- Personal note from customer to trusted contact with instructions
- Early Posterity planning strongly recommended during onboarding
- Discussing planned timeline and Posterity wishes with trusted contacts is strongly encouraged

The six phases are a core brand differentiator and key selling point. The Posterity Phase is the ultimate expression of the product vision and a key marketing and investor talking point.

---

## Core Values
**Compassion over convenience**
Content delivery begins January 1 of the year following an account entering Abeyance — not immediately after the trigger event. The bereaved deserve time to grieve before receiving scheduled content. Posterity prioritizes emotional readiness over technical immediacy.

**Life chapters, not dates**
Most services think in calendar dates. Posterity thinks in life chapters. A plan's year counter does not start when a customer signs up — it starts when their legacy begins for others. A customer who signs up in 2026 and whose account enters Abeyance in 2034 gets a full Year 1 starting January 1 2035. Plans are organized by years of plan, not calendar dates. Two timelines are tracked: payment timeline and delivery timeline.

**Trust through transparency**
No employee ever touches customer funds directly. All financial movements are automated with full audit trails. Customers can trust that their legacy investment is protected.

**Accessibility without compromise**
Financial hardship options ensure everyone can leave something behind regardless of means. A legacy should not be a luxury.

**Control until the end**
Customers can build, test, preview, and adjust their legacy content at any time before their account enters Abeyance. Nothing is set in stone until they are ready. Customers also have the option to manually move their account into Abeyance on their own terms using the "I'm Ready" feature.

---

## Automation Summary
Full automation is a core selling point and key investor talking point. The system is designed to require zero employee involvement in financial movements, content delivery triggering, or check-in management. Every automated process has a corresponding admin alert if it fails. Key automated components:
- 6-month check-in cycle with escalating notification sequence
- Non-response event auto-generation after all notifications unanswered
- Abeyance trigger on non-response event
- January 1 account activation
- Annual delivery schedule auto-generation
- Daily delivery check and post trigger
- Year-by-year fund release via server-side cron job (Mercury Bank)
- Horizon lapse grace period notifications and eventual deletion
- Session log append and context doc update on every npm run sync
- Status bar update on every sync

---

## Plan Year System
- Plans counted in years (Year 1, Year 2, Year 3) not calendar dates
- Year 1 begins January 1 of the calendar year following account entering Abeyance
- Payment timeline and delivery timeline tracked separately
- The Horizon storage fee ($9.99/year) applies throughout both the Building and Planning phases — from signup through all years in which no active plan year is delivering content. Storage fees are not limited to the pre-initiation period.
- Customers can pay for multiple years upfront
- All plans in a customer's account are built during the Building Phase and paid for together at initiation
- Calendar in user profiles built around real calendar dates tied to plan years
- Funds for Year 2 not accessed until Year 1 is complete
- Year-by-year fund release automated via server-side cron job
- Service limit: 5 years guaranteed from Horizon signup, unlimited years optional (best effort, no legal guarantee beyond 5)
- Needs further discussion with lawyer before building anything dependent on long-term service obligations

---

## Horizon Tier
- $9.99/year is a holding fee not a service fee
- Dual purpose:
  1. Inactive account storage — holds content and account data during any year in which no active plan delivery is scheduled, including years between active plan years
  2. Covers Building Phase (before initiation), Planning Phase (post-initiation), and optionally Posterity Phase for accounts transferred to trusted contact
- Content stored but not delivered until account enters Active Phase
- Recurring annual subscription
- Horizon subscription transitions into initiated account upon payment
- Customers can upload content anytime during Horizon phase
- Customers can create and work on multiple plans simultaneously during Horizon

---

## Horizon Lapse Grace Period
If Horizon payment lapses, the following automated notification sequence fires:
- First notification: unique message explaining the lapsed payment, account status, and next steps — distinct from the standard reminder sequence
- Via Twilio SMS: 2 notifications/month for months 1–3 (6 total), each labeled with sequence position (e.g. "Reminder 2 of 6")
- Via Twilio SMS: 2 notifications in final half month, sequence-labeled
- Final notification: unique message confirming the account has been deleted — distinct from the standard reminder sequence
- Total grace period: approximately 3.5 months before deletion
- All notifications fully automated — first and last are unique in content, middle notifications are standard automated reminders with sequence labels

---

## Calendar System
- Plan Year 1 begins January 1 of the calendar year following account entering Abeyance
- Intentional grace period: gives bereaved time to process before account enters Active Phase
- Uses real calendar dates — no relative day counting
- Customers set real dates during calendar setup (anniversaries, birthdays, custom dates)
- System auto-generates annual delivery schedule every January 1
- Leap years handled automatically by real calendar
- When account enters Active Phase, system takes most recent iteration of customer's calendar
- Each calendar entry = Supabase record: plan year, delivery date, content attached, delivery status
- Daily automated check triggers delivery when date matches
- Full automation possible with this model

---

## Check-in System (Planning Phase)
- Customer checks in every 6 months via email or SMS
- Missed check-in triggers the following automated notification sequence:
  - First notification: unique message explaining the missed check-in and next steps — distinct from the standard reminder sequence
  - Via Twilio SMS + email: 2 notifications/month for 3 months (6 total), each labeled with sequence position (e.g. "Reminder 2 of 6")
  - Notifications sent to customer AND all trusted contacts
  - Final notification: unique message confirming the non-response trigger has fired — distinct from the standard reminder sequence
- All notifications fully automated — first and last are unique in content, middle notifications are standard automated reminders with sequence labels
- No response after all 6 notifications: non-response event automatically generated, account moves into Abeyance
- This applies to Planning Phase accounts only (separate from Horizon lapse system)

---

## Trusted Contact System
- Multiple trusted contacts strongly recommended — especially for accounts spanning significant timeframes
- Optional but strongly encouraged
- Primary trusted contact receives all notifications during the first month only
- If primary contact is unanswered: all remaining notifications go to all contacts within the system
- System automatically sends trusted contact(s) an invitation to create their own Posterity portal account
- First invitation: unique message explaining their role, what Posterity is, and their next steps — distinct from the standard resend sequence
- Invitation automatically resent every 6 months until accepted, each resend sequence-labeled. Can also be resent manually via admin dashboard.
- Customer receives notifications alongside trusted contacts reminding them that a trusted contact has not yet set up their account
- Customer receives notification when a trusted contact accepts invitation and sets up their account
- If no trusted contact ever sets up their account: check-in non-response system still functions independently
- Trusted contact portal is a separate login on the Posterity site, completely independent from customer account
- Trusted contact portal shows: their role, linked customer, notification history, confirmation button
- Trusted contact receives all 6 check-in notifications alongside customer during Planning Phase
- When trusted contact believes customer has passed: they log into their portal and submit confirmation
- Confirmation requires double verification (re-enter password + confirmation code sent to their email/phone) to prevent accidental triggering
- Once confirmed: non-response trigger fires, account moves into Abeyance
- All accounts within a customer profile move through phases together simultaneously
- During Twilight and Posterity phases: all trusted contacts notified, primary first, all contacts notified if primary is unanswered after first month
- Trusted contact payment authority: tabled for later discussion
- Trusted Contact page added to global nav dropdown for easy portal access

Recommended onboarding message (verbatim):
"Multiple trusted contacts are recommended, and strongly encouraged for accounts that plan to span significant timeframes. When your account is attempting to live on within our Posterity Phase, multiple trusted contacts increase the likelihood that someone is there and still has the same contact information. Remember, your account might not reach the endpoint on the journey you're about to create for it for years, or even decades. It is also recommended to have trusted contacts that span age ranges that fit your vision for the life of your account."

---

## Social Media Integration
- Platforms: Facebook and Instagram to start, gauge interest and expand later
- Meta Business API required for all scheduled posts
- Backup login credentials REQUIRED
- Individual unique passwords automatically generated by Posterity for each customer, stored securely in Supabase
- Customers are responsible for activating and maintaining their backup credentials prior to account entering Abeyance. Failure to provide credentials is a breach of user agreement but will not cancel service.
- 2FA must be configured using Posterity-controlled backup email or Twilio phone number to ensure access post account activation
- Buffer used by Posterity team post account activation to post content to customer social media accounts. Direct platform login used as fallback.
- Posterity team posts on behalf of customers during Active Phase
- Facebook Memories feature: skipped for now, add later if needed (requires direct login)
- Monitor Meta API announcements as standing operational task
- Meta API risks:
  - Meta reduced Instagram limits 96% in 2025 without warning
  - Video: 10 calls/second cap vs 300 for text
  - Instagram caps API posts at 100 per 24-hour rolling window
  - Mitigation: backup direct login and manual override are essential — this is now an inconvenience, not a risk

---

## Content Creation Portal (Phase 4)
The section of the app where customers build their legacy content. The heart of the customer experience during the Building and Planning phases.

Each piece of content contains:
- File upload (video, photo, message)
- Auto-generated metadata: file type, creation date, post date, delivery method, target platform
- Visual snapshot: first frame of video, image thumbnail, or message preview — auto-generated at upload
- Choose frame or manually generate thumbnail option
- Delivery configuration: recipient, platform, post date
- "Include in Posterity" toggle
- All metadata stored as Supabase record linked to delivery automation

---

## Video & Content Delivery
- Delivered via social media, text (MMS via Twilio), and email
- Hard limit: 25MB maximum, 720p minimum quality, 3–4 minutes maximum length
- FFmpeg.wasm compresses automatically client-side at moment of upload within user profile
- System rejects upload with clear error message if file exceeds 25MB after compression
- Via Twilio MMS: video delivery for files under 25MB
- Secure link fallback via Twilio SMS if MMS carrier delivery fails
- Contract and user profile disclaimer: "If direct video delivery is not possible due to carrier limitations, a secure link to your video will be shared instead"
- Email video delivery via link, not attachment (Phase 5)
- Unused video slots can be used as message slots (flexible rollover)
- Remaining messages/videos ticker in user profiles
- Ability to process multiple posts simultaneously (Phase 5)
- Manual override "Post Manually" button for API failures and general posting workarounds (Phase 5)

---

## Video Storage & Compression
- Storage via Supabase Storage (low cost at early scale)
- Client-side compression via FFmpeg.wasm at point of upload in user profile (Phase 4)
- Per-video limits: 25MB max, 720p min, 3–4 minutes max (enforced at upload)
- Total Supabase storage allocation per tier TBD at scale
- Upgrade path: Cloudflare Stream or Mux at scale
- Video weight explanation (2x units) goes in user manual only, not pricing cards

---

## Customer Contact & Communication
- Via Twilio: dedicated Posterity phone number with voicemail enabled
- Via Twilio: inbound customer contact for Build Your Own inquiries, general questions, Grace tier applications
- Via Twilio: outbound automated SMS notifications to customers (check-ins, alerts, delivery confirmations)
- Via Twilio: delivery of all forms of customer content including messages, videos (MMS), and secure links
- Via Twilio: secure video link delivery fallback if MMS carrier delivery fails
- No intermediary at launch, founder handles directly
- Posterity email account (Phase 5) — used for video delivery via link and responding to customer email inquiries

---

## Financial Architecture
- Customer pre-loads full balance upfront
- Funds held in Posterity Trust Account (internal name) / Posterity Legacy Fund (customer-facing name)
- Mercury Bank two-account setup chosen as intentional workaround to avoid legal ramifications from regional escrow ordinances while achieving the same functional result as formal escrow
- Annual transfers from Trust Account to Posterity Operating Account triggered by server-side cron job at start of each plan year
- No employee ever accesses funds directly — fully automated with audit logs
- Any automation failure triggers immediate admin dashboard alert: what failed, which customer, amount, timestamp, retry status
- Full audit trail for every transfer: timestamp, amount, customer ID, plan year
- Formal escrow deferred to Phase 6 — lawyer review required before Phase 5 financial build begins
- Stripe fees: ~2.9% + $0.30 per transaction — not material at early scale

---

## User Profiles (Phase 4)
- Calendar setup — customers set real dates (anniversaries, birthdays, custom dates) that feed the automation system
- Social media connection (Meta API + unique Posterity-generated backup credentials — required). 2FA configured using Posterity-controlled contact details.
- Video/photo/message upload with FFmpeg compression
- Previews of all uploaded images, videos, and messages displayed within each plan's building dashboard so customers can review their content at any time
- Live cart top right of dashboard (above dropdown nav) — shows all plans currently being built with total cost, storage fee as a permanent separate line item, and next payment date. Updates in real time. Persists across sessions.
- All plans currently being built are automatically in the cart. Customer pays once for all plans simultaneously — full upfront payment.
- Plan deletion automatically removes cart item. Deletion triggers confirmation: "Are you sure? This will permanently delete all work on this plan and cannot be undone."
- Account phase clearly displayed in dashboard at all times
- Trusted contact setup — enter name and email, system sends invitation, customer receives notification when trusted contact sets up their account
- Check-in preferences — recommend enabling BOTH email and SMS notifications for maximum reliability, along with trusted contact details for check-in alerts
- Remaining messages/videos ticker
- Assurance that money not withdrawn until account enters Active Phase
- Multi-plan side menu — customers can create and work on multiple plans simultaneously. Each plan displays its current phase clearly.
- Add Plan button visible in side menu at all times — displayed in a darker shade during Planning Phase
- During Planning Phase: clicking Add Plan goes directly to cart, not plan builder. Automated message: "Accounts in the Planning Phase must fund new plans before building. Complete payment in cart to unlock your new plan build."
- "I'm Ready" button — displayed with explanation: "Don't want to wait for the unexpected? Use this option to manually transition your account into Abeyance and begin your legacy journey on your own terms." Requires double verification to prevent accidental triggering.
- All automated and set up to notify Posterity team

---

## Onboarding & Walkthrough (Phase 4)
- Step-by-step onboarding walkthrough triggered on first login
- Onboarding FAQ available within the app for reference after initial walkthrough, with option to replay walkthrough at any time (also accessible via AI chatbot)
- Explain all six account phases during onboarding
- The six phases should feel like a natural, fluid progression to the customer — not a technical system. Each phase mirrors a stage of their own end of life journey: building their legacy, living with it in place, the quiet waiting, the moment their voice reaches the people they love — and lives on in Posterity.
- Phase language displayed in user profile dashboard so customers always know which phase their account is in
- AI chatbot for customer setup guidance, product explanations, and general questions
- Encourage customers to double-check and test everything before finalizing
- Early Posterity planning strongly recommended
- Grace plan details and guidance included in onboarding FAQ only — not in main onboarding flow
- Explain video storage and posting has higher workload (2x unit weight) — in walkthrough/manual only

---

## Build Your Own & Grace
- Grace plans are available for those facing financial hardship. A consultation with a Posterity rep is required.
- Grace customers do not need to build content before contacting Posterity — contact first, admin sets parameters, customer builds after
- Grace customers pay a reduced storage fee of $4.99/year (Posterity Grace Storage — separate Stripe product, admin-assigned via unique access code generated after consultation)
- This reduced rate is a potential future branding win — could be positioned publicly as a signal of Posterity's commitment to accessibility during Phase 6 marketing review
- No public-facing checkout for Grace storage
- For Grace plans: admin initiates the account on behalf of the customer after consultation
- Grace and Custom customers follow the same phase progression as standard customers — Planning Phase into Abeyance with full trigger system. Custom parameters set by admin determine their posting schedule. Once parameters are set the automated system treats them identically to standard accounts.
- For Custom (Build Your Own) plans: admin sets custom account parameters first, customer builds content after parameters are established following contact. Customer initiates but account goes straight to Planning Phase — no standard Horizon building phase.
- Manual input panel in admin dashboard required for both Grace and Custom account setup
- Custom and Grace tiers use Contact Us buttons on pricing page — no public checkout
- Grace plan details in onboarding FAQ only — not in main onboarding flow

---

## Admin & Operations (Phase 5)

**Operational Dashboard**
All tasks displayed in priority order. Tasks are auto-generated from content delivery events and can also be created manually for voicemails, inquiries, and general operations.

**Task Fields:**
- Label (auto-generated or manually entered)
- Description/summary
- File type
- Delivery method
- Social platform (if applicable)
- Post date
- Creation date
- Priority level
- Target completion date
- Visual snapshot (first frame of video, image thumbnail, or message preview)

**Task Management:**
- Admin calendar view showing all tasks across all dates
- Push back options: 1 day, bottom of priority list, manual date selection
- Tasks unassigned by default — any staff member can claim
- Assignment toggle (on/off) controlled by Director level
- Once claimed: locked to that staff member until complete or reassigned

**Pay Per Task System:**
- Built into admin dashboard
- On/off toggle controlled by Director level
- Tracks tasks completed per staff member
- Video tasks weighted higher than text (mirrors 2x unit weight)
- Used for pay calculation for part-time and casual staff

**Admin Access Tiers:**
- Director — full access including financial dashboard, user management, and all settings
- Manager — full operational access, no financial dashboard
- Staff — content posting and customer inquiries only
- Multiple profiles creatable at each access level

**Financial Dashboard (Director only):**
- Completely separate from operational dashboard
- No employee access to customer funds — audit logs only
- Automated year-by-year fund release via server-side cron job (Mercury Bank)
- Admin dashboard alerts for any automation failures

**Other:**
- Manual input panel for Build Your Own and Grace accounts
- Grace access code generation system (unique codes for Grace storage fee assignment)
- Manual override Post Manually button for API failures and general posting workarounds
- Simultaneous post processing
- Via Twilio: voicemail + outbound SMS notifications
- Posterity email account
- Test account option post-launch
- Standing task: monitor Meta API announcements
- Lawyer review required before Phase 5 financial build begins

---

## Financials & Fixed Costs
Monthly fixed costs at early scale:
- Vercel: $20
- Supabase Pro: $25
- Buffer: $15
- Twilio: $10
- Meta API/Dev tools: $10
- Misc: $20
- Total: $100/month = $1,200/year

Labour assumptions (for pricing review):
- Employee rate: $20/hour
- Text post: 5 mins = $1.67 labour
- Video post: 15 mins = $5.00 labour
- Social media login time not yet factored in — revisit at pricing review

Break-even (solo, cover $1,200/year fixed costs):
- Basic: 13 customers
- Premium: 5 customers
- Legacy: 2 customers

Break-even (with part-time hire, $7,200/year total):
- Basic: 73 customers
- Premium: 29 customers
- Legacy: 9 customers

Realistic mixed target: 25–35 customers covers all costs including part-time hire (12–18 month target)

Full pricing analysis: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing

---

## Legal & Compliance
- Formal Terms of Service before launch (lawyer review)
- Copyright application
- Liability FAQ: Posterity not responsible for customer failure to meet standards of operation
- Standards of use FAQ required
- Refund policy: unspent years refunded ONLY if company closes OR delivery proves unfeasible AND customer met required standards of operation and compliance as outlined in contract
- Refund window: 1 year from initiation
- Data retention: all account data retained 1 year following end of Active Phase (free, included). After that: paid storage option to maintain account in Twilight or Posterity. No payment: account enters deletion grace period.
- 30-day free trial: account locked after 30 days, message informs customer they must fund a plan or subscribe to Horizon to continue. Content saved throughout.
- Tax compliance (Phase 6)
- Service time limit legal documentation (5yr guaranteed, unlimited optional) — lawyer input needed
- Formal escrow language — lawyer review Phase 6
- Lawyer input required before Phase 5 financial build begins

---

## Potential Issues & Risk Register
All identified risks are framed as addressed — not ongoing threats.

**Business Model Risks**
Early adopter activation timing: customers may sign up years before accounts activate, creating a gap between revenue and service delivery. Mitigated by storage fees providing continuous revenue and the Legacy customer cap ensuring the business cannot fail financially from early-stage workload.

**Financial & Legal Risks**
Regional escrow ordinances: holding customer funds pre-delivery could trigger escrow regulations in some jurisdictions. Addressed via Mercury Bank two-account workaround achieving same functional result as formal escrow. Lawyer review required before Phase 5 financial build.

**Technical Risks**
Meta API instability: Meta reduced Instagram API limits 96% in 2025 without warning. Addressed by mandatory backup direct login credentials for every customer account. This is now an inconvenience, not a risk — manual override capability is built in.

**Operational Risks**
Legacy tier workload: one Legacy customer equals the operational load of approximately 13 Basic customers. Addressed by Legacy customer cap (10 customers, configurable from admin dashboard).

**Build Risks**
Financial automation requires lawyer review before Phase 5 build begins. No financial automation should be built until legal review is complete.

---

## Marketing
- Core angle: life chapters not dates
- Hero line: "Your voice. Forever."
- Supporting line: "Your legacy, on your terms"
- The six account phases are a core brand differentiator and selling point. Phase language removes all clinical terminology from the product entirely and should be prominent in marketing materials, the onboarding walkthrough, and the user dashboard.
- The Posterity Phase is the ultimate expression of the product vision — a key marketing and investor talking point.
- Full automation is a key selling point and investor talking point.
- January 1 delivery start is a marketing and trust-building point — Posterity is thoughtful about when content is delivered, not just that it is delivered. Content lands when our customers decided their recipients would be ready to receive it, not in the immediate fog of grief.
- "Your legacy is reaching the ones you love." (Active Phase emotional line)
- Upgrade savings story: more messages/videos = lower cost per unit
  - Premium saves 24.5% vs Basic rate
  - Legacy saves 28.3% vs Basic rate
- Sales sheet + investor growth projections + break-even by user numbers (Phase 6)
- Testimonials section: user videos, text, accolades, articles — build after accruing content (Phase 6)
- Life insurance company partnership (post-launch opportunity)
- Gauge social media platform interest and expand beyond Facebook/Instagram as demand grows

---

## Design Phase (Phase 6)
- App appearance fine-tuning
- Logo design
- Claude design first, Canva as backup

---

## PDF Design Standards
Stylized investor PDF (Posterity_Stylized_Context.pdf) — generated manually via npm run generate-stylized only:
- Cover page: full bleed black (#000000), no wrap, no border. "POSTERITY" small caps top left at 60px from left, 60px from top. Hero text "Your Voice. / Forever." raised to approximately 35–40% down from top. Supporting line Lora italic, thin rule, metadata line — all left aligned at 60px.
- Wrap color: #3a3a3a — outer frame only, never content fill
- Content area: always #000000 black on all interior pages
- First content page: wrap all four sides
- Middle pages: wrap left and right sides only
- Last page: wrap left, right, and bottom only
- Section dividers: #2d4a6e, 1px, full width, 28px margin top and bottom
- Typography: Poppins (section headers #5b9bd5, body white) + Lora italic (#cccccc accents)
- Page numbers: bottom right, #555555, 20px from all edges
- Text clearance: 20px minimum from ALL borders on ALL pages including top edge — applies to every element on every page type
- Previous error (now fixed in code): grey was placed inside content area instead of as outer wrap only

Plain context PDF (Posterity Project Context.pdf) — auto-generated on every npm run sync. Standard format, no styling.

Frozen files (never restyle or restructure):
- Plain context PDF (Posterity Project Context.pdf) and CONTEXT_for_posterity.md are structurally frozen. Layout exists to make moving between sources easier. Never restyle or restructure these two files.
- All other PDFs generated going forward must match the stylized PDF's final design parameters.

---

## Horizon Builds
Horizon Builds is where creative sparks live until they're ready to become reality. These are ideas that emerged organically during the build process — concepts that could change the way Posterity works, looks, or feels. Items here are being actively considered for roadmap inclusion. They are not here because they are unimportant. They are here because they haven't found their stage yet. Each item can be picked up independently at any time and worked on — then set back down when the primary build demands attention. High priority creative items that could reshape the product sit here above the roadmap, not below it.

Any builder can add to Horizon Builds during a session. Claude surfaces new items at session start. Items that graduate into a stage move to the roadmap during the next context update. Adding a Horizon Builds item earns creativity points on your Posterity ID.

Current Horizon Builds:
- Dependency tree visual document (build item map with color-coded arrows showing dependencies between all build items)
- Collaboration MCP suite (tier calculator, point tracker, notification pusher, Posterity ID generator)
- Simultaneous session detection
- Creativity gauge full build (Stage 5+)
- Multiple recipients add-on (tiered: 2–5, 5–10, unlimited)
- Context growth rate management — summary MCP for Google Docs consolidation
- Pricing review once social media login time is measured
- Domain name purchase (posterity.co taken — research alternatives: posterity.app, posteritylegacy.com, etc.)
- Auto-update remaining sessions and hours on each sync based on completed build items
- Reformat all section PDFs to app visual style (blue/black, app typography)
- Claude as Cursor MCP (direct API connection) — custom MCP that routes Cursor Agent questions through Claude.ai context
- Cursor web agent interface — Claude can access cursor.com/agents via Chrome; evaluate direct prompt execution

---

## Tabled & Shelved
Items here are not important enough or worth addressing right now. They are not forgotten — just set aside until relevant.

- Cursor Agent auto-approval settings (Run Mode locked by permissions.json — revisit when solution found)
- Windows screenshot hotkey not working (Fn+PrtScn on Amazon Basics keyboard — revisit)
- Domain name research (posterity.co taken — check posterity.app, posteritylegacy.com, and alternatives)
- Google Docs MCP for collaborator setup documentation (to be configured for new collaborators)
- Team plan pricing evaluation (Cursor/Claude team plans — evaluate when collaborator joins)
- Formal ToS + lawyer review (Phase 6)
- Formal escrow language review (Phase 6)
- posterity.admin@gmail.com created as official admin email — confirm full setup
- Google Docs MCP not syncing correctly — Posterity Project context doc showing 1KB in Google Drive, full context not writing through. Needs investigation next session.
- Rule 26 scroll fix — MCP tab navigates to wrong Claude tab. Needs different implementation.
- Stylized PDF visual corrections pending — three visual issues remain on Posterity_Stylized_Context.pdf: (1) POSTERITY small caps not positioned top-left on cover, (2) hero text "Your Voice. Forever." sitting too low, (3) no uniform grey border clearance on all page edges. Fix prompt is written and ready to run.
- PDF corrections are next in queue immediately after Priority Zero bidirectional loop is confirmed working.
- Cursor cloud agents blank page — environment not yet configured. Page loads blank at cursor.com/dashboard/cloud-agents. Diagnostic prompt written and ready. Do not configure until investigated.
- All stage builds (Stage 3 through Stage 6) permanently tabled until work order is complete. No build work until further notice.
- Stripe build paused indefinitely — resumes only after full work order completion.

---

## Potential Late Add-Ons
- Application/approval process for Legacy tier only
- Additional social media platforms
- Trusted contact payment authority
- Facebook Memories feature
- Trusted contact handling payments after account activation

---

## Tech Stack
| Tool | Purpose |
|------|---------|
| Next.js | App framework |
| Tailwind CSS | Styling |
| Supabase | Database + Auth |
| Stripe | Payments |
| Vercel | Hosting |
| GitHub | Code storage |
| Cursor | AI-assisted code editor |
| Buffer | Social media posting (admin side, post account activation) |
| Twilio | Phone number + voicemail + SMS/MMS |
| FFmpeg.wasm | Video compression (Phase 4) |
| Meta Business API | Facebook/Instagram (Phase 4/5) |
| Mercury Bank | Business banking + automated transfers (Phase 5) |
| Google Docs MCP | Context doc + session log (active) |

---

## Project Location
- Local: C:\Users\jerth\posterity
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Live URL: https://posterity-seven.vercel.app
- Plain context PDF: C:\Users\jerth\OneDrive\Documents\Important\Posterity Project Context.pdf
- Stylized PDF: C:\Users\jerth\OneDrive\Documents\Important\Posterity_Stylized_Context.pdf

---

## What's Been Built
- Development environment (Node.js v24, Git, Cursor)
- Next.js project, Homepage, Login, Signup, Dashboard, Pricing pages
- Working Supabase authentication (email/password, confirmation OFF)
- PWA installed on Android
- Live on Vercel
- MCP servers in Cursor: GitHub MCP (26 tools) + Supabase MCP (29 tools) + Google Docs MCP (active)
- Cursor shell allowlist: npm, node, git, npx auto-approved
- Stripe sandbox account, 4 products created
- Pricing page with all 6 tiers, Stripe checkout working and tested
- Global nav in layout.js (dropdown, all pages)
- Homepage cards matching pricing cards
- sync-context.js + npm run sync for end-of-session context updates
- Project Documents folder created in project root
- Cursor Pro+ ($60/month), Sonnet 4.6 Max active
- Google Docs MCP connected: context doc + session log doc live
- npm run sync now appends session-notes.md to Google Session Log, updates Google Context Doc, resets session-notes.md template
- Homepage visual updates: hero sublines replaced, feature card copy updated (A Living Legacy / On Your Terms / Fully Automated. Fully Protected), nav Pricing→Plans, Login→Account state-dependent logic, hamburger dropdown logged-in/out states, hero buttons removed
- Plans page visual updates: locked pricing ($99/$249/$899), all bullets updated to per plan year, Horizon description updated, Financial Hardship renamed to Posterity Grace, Limited Availability badge on Legacy card, button uniformity across page, card sizing and spacing updated
- Claude in Chrome extension installed, connected, permissions set on all key sites
- .cursorrules file created in project root
- Filesystem MCP (@modelcontextprotocol/server-filesystem) added to mcp.json
- Stripe MCP (@stripe/mcp) added to mcp.json
- posterity-mcp server built (posterity-mcp/index.mjs) — ask_posterity tool tested and confirmed working
- Privacy mode disabled in Cursor, usage-based spending enabled (unlimited)
- Anthropic Console account active — $40 credits, posterity-mcp API key in .env.local
- cursor.com/dashboard accessible via Claude in Chrome
- platform.claude.com accessible via Claude in Chrome
- Puppeteer + markdown-it PDF pipeline (replaces wkhtmltopdf/md-to-pdf)
- Two separate PDF scripts that never overwrite each other: scripts/generate-pdf.js (plain internal context PDF, called automatically by npm run sync) and scripts/generate-stylized-pdf.js (designed investor/collaborator PDF, run manually only via npm run generate-stylized)
- Both commands added to package.json: "generate-pdf" and "generate-stylized"
- sync-context.js confirmed: calls generate-pdf.js only, never touches stylized PDF
- Cursor Pro upgraded to Pro+ ($60/month) — Sonnet 4.6 Max now active, Medium throttling resolved
- PDF pipeline rebuilt: Puppeteer + markdown-it replacing wkhtmltopdf/md-to-pdf
- scripts/generate-pdf.js — plain context PDF, called automatically by npm run sync. Output: C:\Users\jerth\OneDrive\Documents\Important\Posterity Project Context.pdf
- scripts/generate-stylized-pdf.js — styled investor PDF, manual only via npm run generate-stylized. Output: C:\Users\jerth\OneDrive\Documents\Important\Posterity_Stylized_Context.pdf
- Plain PDF output confirmed at 0.65MB
- PDF pipeline rebuilt: Puppeteer + markdown-it replaced wkhtmltopdf/md-to-pdf
- Two PDF scripts: generate-pdf.js (plain, auto via sync) and generate-stylized-pdf.js (investor, manual only)
- Stylized PDF design spec locked (cover, typography, clearance rules, page numbers)
- Cursor upgraded to Pro Max ($60/month) — Sonnet 4.6 Max active
- All six MCP servers connected and active in Cursor (filesystem, gdocs, github, posterity, stripe, supabase)
- Stylized PDF visual corrections partially complete — POSTERITY small caps top-left ✓, blue rule on cover ✓, hero font size corrected to 52px ✓. Top border clearance and hero vertical position still pending.
- ask_posterity confirmed fully working — Cursor Agent can call Claude via MCP and receive accurate answers based on full project context. Verified with Legacy tier pricing question; returned correct $899/year answer.
- Priority Zero Step 1 complete — ask_posterity is live and verified.
- Priority Zero Step 2 scoped — build receive_task and post_result tools in posterity-mcp/index.mjs for true bidirectional Claude ↔ Cursor loop. receive_task writes Claude tasks to cursor-inbox.md for Cursor to read and execute. post_result writes Cursor results to cursor-outbox.md for Claude to read.
- Priority Zero remains open until receive_task and post_result are built and the full bidirectional loop is verified.
- Rule 31 added — first Cursor Agent prompt each session must include: "If npm run dev is not already running, start it first."

---

## Environment Variables
Set in both .env.local and Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_SITE_URL=https://posterity-seven.vercel.app

---

## MCP Setup
Config: C:\Users\jerth\posterity\.cursor\mcp.json (in .gitignore)

Installed MCP Servers (all configured in Cursor):
- filesystem — direct access to local project files
- gdocs — Google Docs integration (Project Context doc + Session Log doc)
- github — GitHub repository tools (26 tools, personal access token, no expiration)
- posterity — custom local project MCP server (C:\Users\jerth\posterity\posterity-mcp\index.mjs) — NOTE: name is confusing, needs renaming to clarify its function (tabled)
- stripe — Stripe API tools (22 tools, 2 prompts enabled)
- supabase — Supabase database tools (29 tools, personal access token sbp_...)

Stripe MCP is now active — Stage 3 Stripe work executes through Cursor via MCP, not manual Stripe dashboard.
Stripe MCP to be renamed to something clearer — tabled.

Claude Console (platform.claude.com) — Anthropic API dashboard. Holds API credit balance used when Cursor calls Claude programmatically. This is NOT Claude the assistant. Credit balance monitored by Jeremy. Auto-reload is on.

---

## Session Workflow

Initiation chain — all work begins here, in this order:
0. First Cursor Agent prompt each session starts with: "If npm run dev is not already running, start it first."
1. Jeremy and Claude brainstorm in Claude.ai → decision reached
2. Claude writes Cursor Agent prompt
3. Jeremy pastes prompt into Cursor
4. Cursor executes
5. If Cursor hits a problem, it escalates to Claude via MCP
6. Claude resolves (can access files, Google Docs, verify visuals via Claude in Chrome)
7. Jeremy reviews result and approves before any push to GitHub
8. Push to GitHub on approval

Claude cannot initiate. Jeremy always starts the chain. Jeremy always approves before push. Nothing is pushed without Jeremy's explicit sign-off.

Claude in Chrome — visual verification layer. Claude can open any Posterity-related tab, access local files, and answer Cursor's questions independently without Jeremy in the middle. Used for: PDF visual verification, file review, Cursor escalation responses.

Jeremy's role: brainstorming, creative decisions, approvals. Not execution, not ferrying prompts, not manual verification.

End of session: Jeremy pastes end-of-session prompt into Cursor Agent → Cursor runs npm run sync (updates CONTEXT_for_posterity.md, appends to Session Log, regenerates plain PDF) → commits and pushes to GitHub on Jeremy's approval.

Locked shortcuts: g or + = go/approved, n or - = no, m = more, * = instruction release confirmation

---

## Operating Procedures

**PDF Pipeline:**
- npm run sync — runs automatically at end of every session. Calls generate-pdf.js only. Outputs plain internal context PDF to C:\Users\jerth\OneDrive\Documents\Important\Posterity Project Context.pdf. Never touches stylized PDF.
- npm run generate-stylized — manual only, never called automatically. Outputs investor PDF to C:\Users\jerth\OneDrive\Documents\Important\Posterity_Stylized_Context.pdf. Run only when stylized PDF changes are needed.
- Visual verification of stylized PDF happens via Claude in Chrome after every generate-stylized run before PDF is shared or moved anywhere.
- Stylized PDF corrections go to Cursor Agent. Claude in Chrome confirms visually after each run.

**Session Start:**
- Claude reads CONTEXT_for_posterity.md in full at session start
- Claude posts session agenda: current stage, next roadmap items, any Tabled & Shelved items superseding stage build, flagged issues from previous session
- If previous session summary was not synced, that is resolved first before any new work starts

**Session End:**
- Compile full session summary before closing
- Jeremy pastes end-of-session sync prompt into Cursor Agent
- Cursor runs npm run sync, commits, pushes on Jeremy's approval
- New Claude chat started from within Posterity project after sync completes

**Approval Gate:**
- Jeremy approves all pushes to GitHub — no exceptions
- Claude and Cursor may prepare, investigate, and draft freely within a session Jeremy has initiated
- Nothing is finalized or pushed without Jeremy's explicit sign-off

**Branches:**
- Branches are not automatic
- Claude flags Jeremy when branch usage is warranted given task complexity or risk level
- Jeremy decides whether to branch

---

## Stripe Products
| Product | Current Price ID | Status |
|---------|-----------------|--------|
| Posterity Horizon | price_1Tcvq1BcdnR2VoDgYustrs4G | No change needed |
| Posterity Basic | price_1TeTeyBcdnR2VoDgYhf7uym0 | Pending update to $99 |
| Posterity Premium | price_1Tcvj2BcdnR2VoDgt4oZu8VA | Pending update to $249 |
| Posterity Legacy | price_1TeTj5BcdnR2VoDgtfA9O3z8 | Pending update to $899 |
| Posterity Grace Storage | N/A | Pending creation at $4.99/year — admin assigned via unique access code |

New Price IDs to be generated when Stripe is updated. Update codebase and Vercel env vars after each change. Always test checkout after updating.

---

## Important Links
- Live site: https://posterity-seven.vercel.app
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Vercel dashboard: https://vercel.com/jerthrwicked/posterity
- Stripe dashboard: https://dashboard.stripe.com/test/dashboard
- Supabase dashboard: https://supabase.com/dashboard/project/vypytfmutmeyfwmkapjg
- Pricing analysis PDF: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing
- Context Google Doc: https://docs.google.com/document/d/1sci1dW16chyAOZ7MuvYBhDMdXZIB0G5LWF7VuuIk9CM/edit?usp=sharing
- Session Log Google Doc: https://docs.google.com/document/d/1l0oGbIbHoDC7FrG7Ds3fqC_cXg0hRsL_k2D6hExJZOY/edit?usp=sharing
- Full automation process PDF: to be created
- Posterity Collaboration System PDF: to be added once stored
- Anthropic Console: https://platform.claude.com
- Cursor dashboard: https://cursor.com/dashboard

---

## Work Order

ALL STAGE BUILDS PERMANENTLY TABLED until this work order is complete. No build work until further notice.

---

**PRIORITY ZERO — Fix the broken system**
Everything below is blocked until the workflow functions. This comes first.
- Priority Zero Step 1 — ask_posterity live and verified ✅
- Priority Zero Step 2 — receive_task and post_result tools built and verified ❌ (next build)
- Current implementation is one-way only: Cursor Agent can call Claude through ask_posterity and receive accurate context-based answers.
- True completion requires a bidirectional loop: Claude must be able to push tasks to Cursor and receive responses.
- Agreed solution: extend posterity-mcp/index.mjs with two new tools — receive_task and post_result.
- receive_task: Claude writes a task to cursor-inbox.md; Cursor reads and executes it.
- post_result: Cursor writes result to cursor-outbox.md; Claude reads it.
- Priority Zero remains open until the bidirectional loop is built and verified.
- Everything else remains blocked until Step 2 is complete.

---

**1. Stylized PDF corrections**
Three visual issues remain on Posterity_Stylized_Context.pdf: (1) POSTERITY small caps not positioned top-left on cover, (2) hero text "Your Voice. Forever." sitting too low, (3) no uniform grey border clearance on all page edges. Fix prompt is written and ready to run. PDF corrections are next in queue immediately after Priority Zero bidirectional loop is confirmed working.

---

**2. Lock PDF design rules**
- All future PDFs (outside context PDF and CONTEXT_for_posterity.md) match stylized PDF final parameters
- Plain context PDF and CONTEXT_for_posterity.md structure frozen permanently — never restyled
- New rule: "context" always means the layout context — the editable working file. Every time, no exceptions.

---

**3. Living Instruction File**
- Single file, always current, pushed to all sources on every sync
- Ready to paste into any new Claude session
- Structure and content to be discussed once Priority Zero and items 1–2 are complete

---

**4. Fix Google Docs MCP**
- Resolve 1KB sync issue so full context writes through
- Add new MCPs to Google Drive
- Enable live line-by-line editing through Claude in Chrome
- Google Docs MCP issue remains tabled until this step is reached in work order

---

**5. Creative alignment pass**
Work through full context until everything matches Jeremy's vision.

---

**6. Legal Preparation Package**
Full legal prep required before any collaborator is given access to the project. Collaborator access is currently paused pending completion of this work.

Items to be researched and produced:
- Copyright: what qualifies in Posterity, what to file now vs. later, registration process and cost
- Patent: whether the automation system, trigger logic, and check-in workflow constitute patentable process IP — patent application summary document to be written
- NDA: collaborator NDA template written and ready before access is granted
- Full consultation prep package: everything above compiled and ready to bring to a lawyer
- Research PDF package: multiple styled PDFs summarizing research across all legal topic areas

Key open questions for legal consultation:
- File copyright now on existing creative work or wait until product is more complete
- Whether patent application is warranted and on what specifically
- How to structure collaborator access legally without damaging a personal relationship

---

## Collaborative Phase
*Auto-generated — identifies tasks safe to build in parallel by a Contributor without conflicting with the current Main Builder stage.*

Current Main Builder stage: Stage 3

Parallel-safe tasks for Contributors:
- Brand copy refinement (no code dependencies)
- Onboarding walkthrough copy and flow documentation (Stage 4 prep, no code required)
- Trusted contact recommended message copy review
- Horizon Builds research (domain name alternatives, dependency tree structure)
- Collaboration Setup Guide Google Doc (document the workflow for future collaborators)
- Collaboration Workflow Google Doc (detailed session start/end procedures)

No code tasks are parallel-safe during Stage 3 — all Stage 3 tasks touch core infrastructure (Stripe, Supabase, auth, nav). Contributors should focus on documentation and copy until Stage 3 is complete.

---

## Collaboration System (Optional Stage 1)

**Purpose**
The collaboration system exists to allow multiple builders to work on Posterity simultaneously without conflicts, lost work, or lengthy handoffs. The context document is the live medium of interchange — not email, not Slack, not verbal. Everything lives in the context. The system is designed to be fun, competitive, and automated wherever possible.

**Builder Roles**
- **Main Builder**: owns primary stage build. Only one Main Builder at a time.
- **Contributors**: work exclusively from the Collaborative Phase section. There is no limit to the number of Contributors active at once.
- Role switch: Contributors post a request in the status bar notification area of the context. Current Main Builder must acknowledge before switch takes effect. The context is the medium — not a separate message.
- For long multi-session builds: declare full plan in context upfront. As long as no builder deviates, no conflicts arise across sessions.
- When a Contributor starts a session: tell Claude the plan before writing any code. Claude reads context, checks for conflicts with other active plans, confirms safe to proceed.

**Posterity ID**
Every builder has a Posterity ID — auto-updated through the session log MCP after every sync.

Jeremy Grego — Founder / Main Builder
- Role: Main Builder
- Contribution Points This Week: —
- All-Time Points: —
- Creativity Gauge: —
- Session Count: —
- Last Active: June 2026

**Point System**
| Contribution | Points |
|-------------|--------|
| Phase completion | 25 pts |
| Phase-changing creative idea | 15 pts |
| Architecture / system design | 10 pts |
| New concept introduced | 10 pts |
| Feature build (scaled by complexity) | 5–15 pts |
| Brand copy written and approved | 8 pts |
| Visual / design contribution | 7 pts |
| Problem reframed creatively | 6 pts |
| Bug resolution (scaled by severity) | 3–8 pts |
| Context / documentation update | 2 pts |
| Simple code fix | 1 pt |

Points reset weekly with running all-time total maintained. Builders can see each other's weekly totals and all-time scores via their Posterity IDs.

**Creativity Gauge**
Two simultaneous gauges:

*Personal creativity gauge* — lives on each Posterity ID. Reflects individual creative contribution rate. Resets weekly with running all-time total. Creativity points are a subset of total points, weighted specifically toward brand-moving contributions.

*Project-wide creativity gauge* — aggregate of all personal gauges. Shows brand momentum over time. Tracked by day, week, month, and all-time. A rising creativity score signals the product is evolving, not just being built.

Creativity point weighting:
- Phase-changing idea: 15 pts
- System design innovation: 12 pts
- New concept introduced: 10 pts
- Brand copy written/approved: 8 pts
- Visual/design contribution: 7 pts
- Problem reframed creatively: 6 pts

The creativity gauge full build is in Horizon Builds — planned for Stage 5+.

**Notification System**
The Project Status Bar IS the notification system. It lives at the top of the context and updates automatically every sync. Never cleared — only updated. Three states: 🟢 current, 🟡 updated since last session, 🔴 simultaneous session or conflict. Also shows pending Main Builder switch requests.

**Simultaneous Collaboration**
When two or more builders are working at the same time, context updates after every build segment. Plans declared explicitly before building. Claude live-tracks declared plans and flags any potential overlaps.

**Workflow Summary**
Session start: pull latest context from Google Drive, upload to Claude Project Instructions, read status bar, declare build plan to Claude before building.
Session end: fill in session-notes.md, run npm run sync, update Claude Project Instructions with new context.
Deviations from workflow require email to posterity.admin@gmail.com with reasoning.

Full setup instructions: see Posterity Collaboration Setup Guide Google Doc (to be created).
Full workflow details: see Posterity Collaboration Workflow Google Doc (to be created).

**Important Contacts**
Jeremy Grego — Founder
posterity.admin@gmail.com
504-402-0450
Contact for: repository access, Google Docs service account key, Supabase credentials, workflow questions, deviation requests.

---

## Rules

**Rule 1 — Session Opening**
At the start of every session Claude must read CONTEXT_for_posterity.md, perform an immediate scan for any issues, and post a brief session agenda including: current stage, next roadmap items, any items from Tabled & Shelved that were last being worked on (these supersede the stage build), and any flagged issues from the previous session.

**Rule 2 — End of Session Scan**
At the end of every session, before updating the context, Claude must perform a thorough scan of CONTEXT_for_posterity.md for inconsistencies, redundancies, repeats, and general issues and report all findings before writing any changes.

**Rule 3 — Collaborative Phase Generation**
At the end of every session, after the scan and before the context update, Claude must auto-generate a Collaborative Phase section after the Build Roadmap identifying build tasks that can be worked on in parallel without conflicting with the primary stage build. If nothing safe to build in parallel exists, the section must say so explicitly.

**Rule 4 — No Context Posted Without Approval**
Claude must never post a full context rewrite prompt without first presenting a complete summary of all changes being made and receiving explicit approval.

**Rule 5 — Account vs Plan Language**
Claude must always use "account" when referring to phase progression and "plan" when referring to content delivery configuration. Never use "plan" in a phase context.

**Rule 6 — No TBD in Context**
Claude must never write TBD in the context document. If something is unresolved it goes in Tabled & Shelved with a clear explanation.

**Rule 7 — Death Language**
Claude must never use death, passing, deceased, or any clinical mortality language in customer-facing context sections. Internal terms only where absolutely necessary, clearly labeled as internal.

**Rule 8 — Completeness Check**
Before finalizing any context update Claude must verify that every item discussed in the session has a clearly assigned location in the document and has been included.

**Rule 9 — Response Shortcuts**
The following shortcuts are only recognized when pasted as a standalone single character message:
- g or + = Go / Approved / Good / Positive feedback
- n or - = No / Don't proceed / Negative feedback
- m = More — provide additional feedback, points, opinions, or options on the last response
- * = Release confirmation code for instruction release
- [number] = Toggle the corresponding numbered rule ON or OFF. Claude responds with "Rule [X] ON" or "Rule [X] OFF" to confirm.

**Rule 10 — Brainstorm Protocol (default: OFF)**
When toggled ON via "10" posted solo, Claude reads the entire message before responding, identifies every distinct point or shift in topic, consolidates related points, and resolves them one at a time in sequence. Claude does not move to the next point until the current one is fully resolved. Toggle ON or OFF by posting "10" solo.

**Rule 11 — Context Size Warning**
When CONTEXT_for_posterity.md is growing large enough to risk hitting Project Instruction limits or degrading response quality, Claude must flag it immediately. Context shortening takes precedence over all other workflow priorities until resolved.

**Rule 12 — Conversation Length Warning**
When a conversation becomes long enough to affect Claude's memory, response quality, or context window efficiency, Claude must proactively flag it and recommend moving to a new chat within the Posterity project before quality degrades.

**Rule 13 — Tabled & Shelved Updates**
Any item that is intentionally set aside during a session must be immediately added to the Tabled & Shelved section with a clear explanation of why it was set aside and what needs to happen before it can be addressed.

**Rule 14 — Copy Accessibility**
Every item that may need to be copied must be presented in its own individual code block. This includes: terminal commands, Cursor Agent prompts, file paths, API keys, links, credentials, rule text, and any other copyable content. Each distinct copyable item gets its own separate code block — never buried in prose.

**Rule 15 — Step Batching**
During any step-by-step process, Claude must batch multiple simple sequential steps into a single message when they require no decision-making or back-and-forth. Only separate steps when a response or decision is needed before proceeding.

**Rule 16 — Context Repost**
When a back-and-forth exchange on a single topic extends beyond approximately one screen length, and the topic itself does not exceed a screen length, Claude must automatically repost a brief summary of what we are currently working on. If we are mid-sequence in any step-by-step process and have not completed all steps, Claude reposts the full original step sequence with a marker showing where we currently are.

**Rule 17 — Cursor Agent Workflow**
Claude's role in this project is to brainstorm, plan, make decisions, write prompts, manage context, troubleshoot issues, and assist with debugging. All coding, file creation, terminal commands, and pushes to GitHub are handled by the Cursor Agent. Claude must always provide copy-ready prompts for the Cursor Agent rather than raw terminal commands. Claude never assumes the user will run commands directly unless explicitly asked. When a coding task is ready, Claude writes a complete Cursor Agent prompt in a code block. The user pastes it into Cursor Agent and reports back results.

**Rule 18 — Assume Agreement Protocol**
Claude assumes Jeremy agrees with proposed changes unless he indicates otherwise. Every point requiring confirmation is presented clearly. Silence = agreement. Claude does not ask for confirmation on items already confirmed.

**Rule 19 — Think First**
Before writing any language into the context or presenting it as confirmed, Claude must read it back against prior decisions and check for redundancy, contradiction, or logical errors. Claude is not a transcription service — active thinking is required at every step. If something reads wrong, flag it rather than write it.

**Rule 20 — Section PDF Protocol**
When a section of the context becomes large enough to warrant its own document, Claude creates a PDF version styled to match the app visual design, adds a brief description and link in the relevant section of the context, and automatically adds the link to the Important Links section. Links added anywhere in the context are always mirrored in Important Links. Links are exempt from the redundancy/repeat rule.

**Rule 21 — Hold All Instructions Until Released**
Every instruction Jeremy gives remains active until explicitly no longer needed. When Claude believes an instruction is no longer needed it flags it clearly and concisely for approval before releasing it. Format: "Ready to release: [instruction]. Confirm?" Release confirmation code: *

**Rule 22 — Auto-Upload Rules to Context**
Every new rule added during a session is automatically included in the next context update. No rule gets lost between sessions.

**Rule 23 — UI Navigation Guidance**
When explaining anything that involves a dashboard, settings panel, or interface, always include exact location instructions — where to click, what menu it's under, what it looks like — as if Jeremy is seeing it for the first time. Step by step. No assumed familiarity with any UI.

**Rule 25 — Prompt End Notification**
After every Cursor Agent prompt, Claude posts a summary line immediately after the code block stating what the prompt covers and how many changes. Format: Prompt complete — [X] changes across [Y] files. Paste and run.

**Rule 26 — Auto-Scroll After Long Responses**
After any response exceeding approximately one page, Claude posts a follow-up using Claude in Chrome to scroll the chat to the bottom. Current implementation navigates wrong tab — fix pending.

**Rule 27 — Model and Session Guidance**
Sonnet 4.6: default for all standard builds. Opus 4.8 + Extended Thinking: architectural decisions, complex multi-system debugging, decisions affecting multiple phases. New chat: when Rule 12 fires, when switching stages, or when starting fresh. Claude flags this unprompted when warranted.

**Rule 28 — Proactive Information Retrieval**
Claude retrieves non-sensitive read-only information from permitted sites without asking first. Only stops to ask when an action would write, submit, send, purchase, or expose credentials.

**Rule 29 — Approved Copy Protection**
Claude never edits, paraphrases, restructures, or improves approved copy without explicit permission. Approved copy is reproduced exactly or not at all. Changes presented as suggestions only.

**Rule 30 — No Action Without Confirmation**
Claude never builds, codes, or generates any file without explicit confirmation. Silence is not confirmation. Explicit go signal required every time. Claude always responds before building.

**Rule 31 — First Cursor Agent Prompt**
At the first Cursor Agent prompt each session, include a reminder line at the top: "If npm run dev is not already running, start it first."

**Rule 32 — Branch Notification**
Claude notifies Jeremy when branch usage is warranted for a given task. Jeremy makes the final decision. Branches are never created automatically.

**Rule 33 — Context Language**
"context" always refers to the layout context — CONTEXT_for_posterity.md — the editable working file. This applies in every scenario without exception.

---

## Brand Copy
This section stores all approved brand copy for use throughout the app, marketing materials, onboarding, and investor documents. Copy stored here has been reviewed and approved. Use these as the source of truth for all written customer-facing language.

**Approved copy — Onboarding opening:**
"Before you move forward on your legacy journey, you first must go back. Back through the memories, friendships, love, connection, brilliance, creations, accomplishments — all the uniqueness that made you you. The little and big things that make life feel well-lived. You'll relive your past, so you can carry it into the future."

**Approved copy — Product explanation:**
"With Posterity, you create a custom tailored legacy that will — on your terms — reach whatever goal or goals you design for it. Do you want your plans to slowly tell a story, one person at a time, to those you think need to hear it? Do you want all of them to not realize you were telling a story the entire time, with a final post to everyone you know? The only limit is your creativity. As you journey back through your life to create your legacy content, you are creating an account that will journey forward. It can be a secret, a confession, a reminder, a remembrance, a photo album — it can solely be a way for your loved ones to relive the joy you've shared together. Your legacy is whatever you want it to be, and it starts now."

**Approved copy — Posterity Phase:**
"Your Posterity account will become a living representation of the legacy you created."

**Approved copy — Hero line:**
"Your voice. Forever."

**Approved copy — Supporting line:**
"Your legacy, on your terms."

**Approved copy — Active Phase emotional line:**
"Your legacy is reaching the ones you love."

Note: This section will expand as copy is written and approved for each area of the app. Eventually this context document will evolve into a full sales and vision document encompassing the product philosophy, automation systems, brand ethos, and investor narrative. (Stage 6)

---

## How To Resume
1. Open Cursor
2. Open terminal (Ctrl + backtick)
3. cd posterity
4. npm run dev
5. Open http://localhost:3000
6. End of session: npm run sync then commit and push

---

## Developer Notes
- Windows 11, PowerShell (no && between commands)
- Node.js v24.16.0, non-technical founder, all code by AI
- Owner: jerthrwicked (GitHub)
- Founder: Jeremy Grego
- Admin email: posterity.admin@gmail.com
- Phone: 504-402-0450
- g or + = go/approved, n or - = no, m = more, * = instruction release confirmation
- File creation: use $content = @'...'@ then [System.IO.File]::WriteAllText() to avoid UTF-8 corruption
