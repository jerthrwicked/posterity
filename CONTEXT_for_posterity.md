# Posterity - Project Context

## Project Status
🟢 Context current | Last sync: June 13, 2026 | Version: 2
👤 Main Builder: Jeremy Grego | Contributors: None active
⚠️ No pending notifications
📊 Context size: [100%] ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
Note: the context size bar is hardcoded — live percentage calculation is a pending sync-context.js fix (see MCP Setup section).

---

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after they are gone. A digital time capsule with a subscription model. Posterity posts content on behalf of customers to their chosen delivery platforms after account activation.

---

## Account Lifecycle & Phases
Posterity accounts move through six distinct phases, in sequence. It is important to understand that only accounts shift phases. Plans exist within accounts and move alongside them — plans do not independently progress between phases. Think of the account as the container and the plans as its contents. When the account moves forward, its contents move with it.

This language appears throughout the product, the onboarding walkthrough, and all customer-facing materials. It is a core part of what makes Posterity unique — clinical terminology is removed entirely. The system responds only to events and dates, never to the customer's passing itself.

**Key Terms:**
- **Initiate** — To pay for an account. An initiated account has been funded by paying for some or all of the plans within it. Upon initiation, the account enters the Planning Phase and the check-in system begins.
- **Non-response trigger** *(internal term only)* — the system event that moves an account into the Abeyance phase. Occurs in one of three ways:
  1. All check-in notifications go unanswered and a non-response event is automatically generated
  2. Trusted contact confirms identity and submits confirmation through their portal
  3. Customer manually moves their account into Abeyance using the "I'm Ready" option
  The system responds only to events — never to the customer's passing itself.
- **Legacy** — the complete body of scheduled content a customer builds within Posterity. Includes all messages, videos, photos, and notes set for delivery to chosen recipients beginning when the account enters its Active Phase. Each customer has one primary legacy; an optional second legacy is buildable during the Posterity Phase.

**The Six Phases:**

**Phase 1 — Horizon (Building Phase)**
The customer has subscribed to Horizon at $9.99/year. They are actively building their legacy — uploading content, setting up their calendar, and selecting the plan tiers they intend to include in their account. Multiple plans can be built and worked on simultaneously via a side menu in the dashboard. There is no time limit on this phase. The Horizon subscription covers storage for as long as the customer remains in this phase.

**Phase 2 — Planning Phase (Post-Initiation)**
The customer has funded their account by paying for their plan(s). Plans now exist, are funded, and content continues to be refined. The customer continues their regular 6-month check-ins. This is typically the longest phase — it lasts from the moment an account is initiated until the non-response trigger fires or the customer manually moves their account into Abeyance, potentially spanning years or decades.

**Phase 3 — Abeyance**
A trigger event has occurred — either the non-response trigger has fired or the customer has manually moved their account into Abeyance using the I'm Ready feature. The account enters a quiet pause. No content is delivered during this phase. This is intentionally brief — lasting until the following January 1, a maximum of approximately 11 months. This grace period reflects one of Posterity's core values: the bereaved deserve time to process before their loved one's account enters its Active Phase.

**Phase 4 — Active Phase**
The account is delivering content according to the customer's calendar. Activation occurs automatically on calendar day 1 of the first year following the account entering the Abeyance phase. The system automatically generates that year's delivery schedule and posts content on the dates the customer set. This phase repeats annually for each plan year initiated. Skipped years between plans are possible in this phase, and a storage fee for each skipped year is automatically applied to the customer's checkout cart when they skip a year. Storage fees stack per skipped year.

**Phase 5 — Twilight**
The final Active plan year is complete. The account enters a quiet pause following the final Active plan year. The first year of Twilight is free — no storage fee. All trusted contacts are notified. Most trusted contacts use this year to download and share content rather than move the account into paid storage. Some accounts end here.

**Phase 6 — Posterity Phase**
The account has been transferred to the trusted contact. It lives as a permanent archive of the delivered legacy. The trusted contact takes over storage at $9.99/year if they choose to keep the account live. Otherwise, the legacy continues in whatever form the trusted contact — guided by the customer's wishes — chooses for it. Accounts that do not enter Posterity cease to exist after the free Twilight year ends.

The Posterity Phase is triggered when the trusted contact logs into their portal, confirms identity through double verification, and accepts the transfer. The dashboard becomes a clean archive — photo album style, no editing. Accounts that enter Posterity can live on indefinitely.

Posterity Phase features:
- "Include in Posterity" toggle on every content item during creation
- Optional second legacy buildable through the Posterity Phase delivery feature within the plan builder
- "Add custom Posterity recipient" button
- Personal note from customer to trusted contact with instructions
- Early Posterity planning strongly recommended during onboarding
- Discussing planned timeline and Posterity wishes with trusted contacts is strongly encouraged

The six phases are a core brand differentiator and key selling point. The Posterity Phase is the ultimate expression of the product vision and a key marketing and investor talking point.

---

## Plan Year System
- Each plan covers one year of content delivery. A customer's account contains one or more plans, each assigned a tier (Basic, Premium, Legacy, Custom, or Grace) and a plan year (Year 1, Year 2, Year 3, etc.). Tiers can vary plan to plan — Year 1 might be Premium, Year 2 might be Legacy, Year 3 might be skipped (storage fee applies), Year 4 might be Basic. Plan years count from account activation forward, not from subscription date or calendar year.
- Year 1 begins January 1 of the calendar year following account entering Abeyance
- Payment timeline and delivery timeline tracked separately
- Outside of any grace or warning periods, payment of storage fees is necessary in order to avoid account deletion.
- Skipped plan years (years for which no plan is built) generate non-recurring storage fees automatically added to the customer's checkout cart, stacking per skipped year.
- Customers can pay for multiple years upfront
- All plans in a customer's account are built during the Building Phase and paid for together at initiation
- Calendar in user profiles built around real calendar dates tied to plan years
- Funds for Year 2 not accessed until Year 1 is complete
- Year-by-year fund release automated via server-side cron job
- Service limit: 5 years guaranteed from Horizon signup, unlimited years optional (best effort, no legal guarantee beyond 5)
- Needs further discussion with lawyer before building anything dependent on long-term service obligations

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

All paid plans include the option to send an accompanying handwritten note with each scheduled message.

---

## Horizon Tier
- $9.99/year is a holding fee not a service fee
- Dual purpose:
  1. Inactive account storage — Storage fees allow us to cover the costs associated with account storage outside of paid plan years. The payment allows us to maintain content and account data during any year in which no active plan delivery is scheduled, including years between active plan years.
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
- Year selection in calendar UI — customers pick which plan year they are configuring before placing content. Year arrows, plan year list, and manual year input all supported. Skipped years are surfaced in the calendar with the storage fee notice attached.
- Full automation possible with this model

---

## Check-in System (Planning Phase)
- Customer checks in every 6 months via email, SMS, or a check-in button within the user profile
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
- Personal note from customer to trusted contact with delivery instructions — written during legacy creation, surfaced to the trusted contact at confirmation time
- During Twilight and Posterity phases: all trusted contacts notified, primary first, all contacts notified if primary is unanswered after first month
- Trusted contact payment authority: tabled for later discussion (see Tabled & Shelved for full scope including plan-funding authority for unfinished accounts and a second trigger type for Horizon-phase confirmation)
- Trusted Contact page added to global nav dropdown for easy portal access

Recommended onboarding message (verbatim):
"Multiple trusted contacts are recommended, and strongly encouraged for accounts that plan to span significant timeframes. When your account is attempting to live on within our Posterity Phase, multiple trusted contacts increase the likelihood that someone is there and still has the same contact information. Remember, your account might not reach the endpoint on the journey you're about to create for it for years, or even decades. It is also recommended to have trusted contacts that span age ranges that fit your vision for the life of your account."

---

## Financial Architecture
- Customer pre-loads full balance upfront
- Funds held in Posterity Trust Account (internal name) / Posterity Legacy Fund (customer-facing name)
- Payment methods at launch: card (Stripe direct), PayPal (Stripe's native PayPal integration — no separate PayPal account or API needed)
- Mercury Bank two-account setup chosen as intentional workaround to avoid legal ramifications from regional escrow ordinances while achieving the same functional result as formal escrow
- Annual transfers from Trust Account to Posterity Operating Account triggered by server-side cron job at start of each plan year
- No employee ever accesses funds directly — fully automated with audit logs
- Any automation failure triggers immediate admin dashboard alert: what failed, which customer, amount, timestamp, retry status
- Full audit trail for every transfer: timestamp, amount, customer ID, plan year
- Formal escrow deferred to Stage 6 — lawyer review required before Stage 5 financial build begins
- Stripe fees: ~2.9% + $0.30 per transaction — not material at early scale

**Trust model under review (pencilled in before Stage 5 financial build):** the current upfront-payment + trust-fund architecture vs. alternative year-by-year billing (charged each January 1 as plan year activates). Full ramifications, customer trust signal impact, refund obligation changes, and legal posture all to be brainstormed before financial build begins. See Tabled & Shelved for the open brainstorm item.

---

## Content Creation Portal (Stage 4)
The section of the app where customers build their legacy content. The heart of the customer experience during the Building and Planning phases.

Each piece of content contains:
- File upload (video, photo, message)
- Auto-generated metadata: file type, creation date, post date, delivery method, target platform
- Visual snapshot: first frame of video, image thumbnail, or message preview — auto-generated at upload
- Choose frame or manually generate thumbnail option
- Delivery configuration: recipient, platform, post date
- "Include in Posterity" toggle
- All metadata stored as Supabase record linked to delivery automation

Plan year + recipient + scheduling controls:
- Plan year selector — customer picks the plan year before adding content (arrows, plan year list, manual input). Each plan represents one year of delivery.
- Recipient input per piece — name, contact info, platform handle, pulled from saved recipient master list
- Recipient master list — customer adds a recipient once and reuses across pieces and plans
- Handwritten note attachment per message (paid plans only)
- Delivery method per piece — social platform, email, or SMS chosen independently
- Schedule preview — calendar view showing where this piece sits within the selected plan year
- Draft vs scheduled state — distinguish unscheduled drafts from locked-in pieces
- Edit window — pieces are fully editable until the account enters Abeyance, then locked. Lock status displayed clearly on each piece during Planning Phase.
- Validation on upload — auto-reject on size/format/length fail with specific error

---

## Video & Content Delivery
(Excluding email, all forms of customer contact are handled via Twilio.)

- Delivered via social media, text (MMS via Twilio), and email
- Hard limit: 25MB maximum, 720p minimum quality, 3–4 minutes maximum length
- FFmpeg.wasm compresses automatically client-side at moment of upload within user profile
- System rejects upload with clear error message if file exceeds 25MB after compression
- Via Twilio MMS: video delivery for files under 25MB
- Secure link fallback via Twilio SMS if MMS carrier delivery fails
- Contract and user profile disclaimer: "If direct video delivery is not possible due to carrier limitations, a secure link to your video will be shared instead"
- Email video delivery via link, not attachment (Stage 5)
- Unused video slots can be used as message slots (flexible rollover)
- Remaining messages/videos ticker in user profiles
- Ability to process multiple posts simultaneously (Stage 5)
- Manual override "Post Manually" button for API failures and general posting workarounds (Stage 5)

---

## Video Storage & Compression
- Storage via Supabase Storage (low cost at early scale)
- Client-side compression via FFmpeg.wasm at point of upload in user profile (Stage 4)
- Per-video limits: 25MB max, 720p min, 3–4 minutes max (enforced at upload)
- Total Supabase storage allocation per tier to be determined at scale
- Upgrade path: Cloudflare Stream or Mux at scale

---

## Customer Contact & Communication
All voice, SMS, and MMS communication runs through Twilio. Email runs through the Posterity email account (Stage 5).

- Dedicated Posterity phone number with voicemail enabled
- Inbound customer contact for Build Your Own inquiries, general questions, and Grace tier applications
- Outbound automated SMS notifications (check-ins, alerts, delivery confirmations)
- Delivery of customer content including messages, videos (MMS), and secure links
- Secure video link delivery fallback if MMS carrier delivery fails
- Posterity email account used for video delivery via link and responding to customer email inquiries (Stage 5)
- No intermediary at launch — founder handles direct customer contact

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

## User Profiles (Stage 4)
- Calendar setup — customers set real dates (anniversaries, birthdays, custom dates) that feed the automation system
- Social media connection (Meta API + unique Posterity-generated backup credentials — required). 2FA configured using Posterity-controlled contact details.
- Video/photo/message upload with FFmpeg compression
- Previews of all uploaded images, videos, and messages displayed within each plan's building dashboard so customers can review their content at any time
- Live cart top right of dashboard (above dropdown nav) — shows all plans currently being built with total cost, storage fee as a permanent separate line item, and next payment date. Updates in real time. Persists across sessions.
- All plans currently being built are automatically in the cart. Customer pays once for all plans simultaneously and storage fees for skipped years — full upfront payment. *(Full payment model is under discussion — see Tabled & Shelved.)*
- Plan deletion automatically removes cart item. Deletion triggers confirmation: "Are you sure? This will permanently delete all work on this plan and cannot be undone."
- Payment setup — supports card and PayPal (both via Stripe). Pre-loaded balance model with year-by-year automated release. *(Full payment model is under discussion — see Tabled & Shelved.)*
- Account phase clearly displayed in dashboard at all times
- Trusted contact setup — enter name and email, system sends invitation, customer receives notification when trusted contact sets up their account
- Check-in preferences — recommend enabling BOTH email and SMS notifications for maximum reliability, along with trusted contact details for check-in alerts
- Check-in confirmation button — resets the 6-month check-in clock when pressed. Visible on dashboard. Confirmation message + next check-in date displayed after press.
- Content builder access point — primary entry into the Content Creation Portal
- Test/preview mode entry — opens a preview surface where the customer can see exactly how a scheduled piece will deliver to its recipient (post layout, message preview, video player, link delivery), platform by platform. Accessible from any plan during Building or Planning Phase. Customers are encouraged to preview every piece before account initiation.
- Plan year status overview — which years are configured, scheduled, paid, or skipped
- Notification settings — opt-in/out by message type, channel preference (email/SMS)
- Remaining messages/videos ticker
- Multi-plan side menu — customers can create and work on multiple plans simultaneously. Each plan displays its current phase clearly.
- Add Plan button visible in side menu at all times — displayed in a darker shade during Planning Phase
- During Planning Phase: clicking Add Plan goes directly to cart, not plan builder. Automated message: "Accounts in the Planning Phase must fund new plans before building. Complete payment in cart to unlock your new plan build."
- "I'm Ready" button — displayed with explanation: "Don't want to wait for the unexpected? Use this option to manually transition your account into Abeyance and begin your legacy journey on your own terms." Requires double verification to prevent accidental triggering.
- Automated admin notifications fire on multiple triggers — see Admin & Operations for the full list

---

## Build Your Own & Grace
- Grace plans are available for those facing financial hardship. A consultation with a Posterity rep is required.
- Grace customers do not need to build content before contacting Posterity — contact first, admin sets parameters, customer builds after
- Grace customers pay a reduced storage fee of $4.99/year (Posterity Grace Storage — separate Stripe product, admin-assigned via unique access code generated after consultation)
- This reduced rate is a potential future branding win — could be positioned publicly as a signal of Posterity's commitment to accessibility during Stage 6 marketing review
- No public-facing checkout for Grace storage
- For Grace plans: admin initiates the account on behalf of the customer after consultation
- Grace and Custom customers follow the same phase progression as standard customers — Planning Phase into Abeyance with full trigger system. Custom parameters set by admin determine their posting schedule. Once parameters are set the automated system treats them identically to standard accounts.
- For Custom (Build Your Own) plans: admin sets custom account parameters first, customer builds content after parameters are established following contact. Customer initiates but account goes straight to Planning Phase — no standard Horizon building phase.
- Manual input panel in admin dashboard required for both Grace and Custom account setup
- Custom and Grace tiers use Contact Us buttons on pricing page — no public checkout
- Grace plan details in onboarding FAQ only — not in main onboarding flow

---

## Admin & Operations (Stage 5)

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

**Automated Admin Notifications**
Why phase transitions notify the team: phase entries are operational handoff points. When an account enters Active Phase, the team confirms Buffer is connected, backup credentials are live, and the calendar generated correctly. Twilight entry signals the trusted contact notification flow needs to fire correctly and that trusted contact payment pathways need to be ready. Posterity Phase entry restructures the dashboard into archive mode. Phase entries are also moments where automation could fail silently — flagging them gives the team a visible checkpoint even when no action is required.

*Full notification system design pending dedicated brainstorm — see Horizon Builds. The list below captures known triggers and is subject to refinement during the notification brainstorm.*

Automated admin notifications fire on the following triggers:

*Content & posting*
- Post execution deadline approaching (configurable lead time per piece)
- Post execution failed (API error, credential issue, content rejection)
- Content upload error or rejection
- Calendar setup completed for any plan year
- Customer attempts to edit content after edit window closed

*Phase transitions*
- Account initiated (entered Planning Phase)
- Non-response trigger fires
- Account enters Abeyance
- Account enters Active Phase (Year 1 begins)
- Plan year transition (Year N → Year N+1)
- Account enters Twilight
- Account enters Posterity Phase

*Customer actions*
- I'm Ready button confirmed (double verification passed)
- Plan deletion confirmed
- Backup credentials updated
- Customer-initiated voicemail or SMS
- Refund request submitted

*Trusted contact actions*
- Trusted contact invitation accepted, declined, or expired
- Trusted contact confirmation submitted (double verification passed)
- Trusted contact paid storage fee (non-recurring, in either applicable scenario)

*Payments*
- Payment received (initial, renewal, skip-year storage, multi-year prepay)
- Payment added (new card or PayPal connection)
- Payment failed (Stripe or PayPal)
- Free trial expiring within 7 days
- Horizon lapse sequence triggered

*Check-ins*
- Customer missed check-in (sequence-labeled per notification stage)
- Customer responded to check-in after missing

*Operations*
- Backup credentials missing or expired before account enters Active Phase
- 2FA recovery attempt detected
- Direct platform login required (Meta API failure fallback)
- Grace tier consultation request submitted
- Custom (Build Your Own) consultation request submitted
- Legacy completion — final scheduled post published (triggers Legacy Completion Moment)
- Any automation failure (fund release, post send, notification send)

**Other:**
- Manual input panel for Build Your Own and Grace accounts
- Grace access code generation system (unique codes for Grace storage fee assignment)
- Manual override Post Manually button for API failures and general posting workarounds
- Simultaneous post processing
- Voicemail (via Twilio) + outbound SMS notifications
- Posterity email account
- Test account option post-launch
- Standing task: monitor Meta API announcements
- Lawyer review required before Stage 5 financial build begins

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
- Skipped-year storage fee auto-added to cart at point of skip
- Session log append and context doc update on every npm run sync
- Status bar update on every sync

---

## Onboarding & Walkthrough (Stage 4)
(Deferred — content and flow cannot be finalized until the Content Builder, User Profiles, and all delivery systems are complete, since new requirements will emerge during those builds. Revisit timing before Stage 4 build begins.)

- Step-by-step onboarding walkthrough triggered on first login
- Onboarding FAQ available within the app for reference after initial walkthrough, with option to replay walkthrough at any time (also accessible via AI chatbot)
- Explain all six account phases during onboarding
- The six phases should feel like a natural, fluid progression to the customer — not a technical system. Each phase mirrors a stage of their own end of life journey: building their legacy, living with it in place, the quiet waiting, the moment their voice reaches the people they love — and lives on in Posterity.
- Phase language displayed in user profile dashboard so customers always know which phase their account is in
- AI chatbot for customer setup guidance, product explanations, and general questions
- Encourage customers to double-check and test everything before finalizing
- Early Posterity planning strongly recommended
- Grace plan details and guidance included in onboarding FAQ only — not in main onboarding flow

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

## Marketing
- Core angle: life chapters not dates
- Hero line: "Your Voice. Forever."
- Supporting line: "Your legacy, on your terms"
- The six account phases are a core brand differentiator and selling point. Phase language removes all clinical terminology from the product entirely and should be prominent in marketing materials, the onboarding walkthrough, and the user dashboard.
- The Posterity Phase is the ultimate expression of the product vision — a key marketing and investor talking point.
- Full automation is a key selling point and investor talking point.
- January 1 delivery start is a marketing and trust-building point — Posterity is thoughtful about when content is delivered, not just that it is delivered. Content lands when our customers decided their recipients would be ready to receive it, not in the immediate fog of grief.
- Upgrade savings story: more messages/videos = lower cost per unit
  - Premium saves 24.5% vs Basic rate
  - Legacy saves 28.3% vs Basic rate
- Sales sheet + investor growth projections + break-even by user numbers (Stage 6)
- Testimonials section: user videos, text, accolades, articles — build after accruing content (Stage 6)
- Life insurance company partnership (post-launch opportunity)
- Gauge social media platform interest and expand beyond Facebook/Instagram as demand grows

**Legacy Completion Moment as Marketing Artifact**
The completion celebration described in the Legacy Completion Moment section is the only celebratory experience in the legacy-planning category. Most platforms in this space treat completion as silence — the form is filled, the inbox returns to empty. Posterity treats completion as the milestone it is. The transition from austere to brilliant color is intentionally screenshot-worthy without being staged for sharing.
Angle: the only legacy platform that celebrates the completion of your legacy with you.

**Life Chapters, Not Dates — extended frame**
Posterity is not a time capsule. Time capsules are about a date. Posterity is about a chapter — the one being closed, and the one beginning for the people who loved you. Year 1 does not start in 2026. It starts when your story does for them. All marketing copy moves language away from calendar-anchored phrasing ("delivered on this date") toward chapter-anchored phrasing ("delivered in your first year").

**Financial Trust Signal**
The Posterity Legacy Fund (Mercury Bank two-account architecture) means money paid today is not money spent today. Funds are released year-by-year as plans activate. No employee touches them. Full audit trail. Verbatim marketing point. Subject to refinement pending the trust-model discussion under Tabled & Shelved.

**The Second Legacy**
Most products end at the customer's end. Posterity continues. The Posterity Phase, when accepted by the trusted contact, supports a second legacy — built through the same plan builder, delivered by the trusted contact. The customer's voice does not stop. It hands off.
Angle: your voice continues, even past your own.

**Founder-led, small-audience positioning**
Posterity does not chase scale. Onboarding is approval-gated by design. Legacy tier carries Limited Availability. This is not a constraint — it is the product philosophy. Each account is a person who decided to plan their legacy and was met by a founder who knew their name.
Angle: Posterity is not for everyone. It is for the ones who decided their voice should outlast them.

**Voice consistency**
All marketing language is reviewed against approved Brand Copy. Anything originated outside approved copy is treated as draft until reviewed. Rule 29 applies to all marketing material.

---

## Legacy Completion Moment

When a customer publishes the final available post within their account, a sequence fires.

A notification takes over the user profile screen. "Congratulations" — in a color the customer will not have seen up until now — slowly materializes as the entire palette transitions: the app's signature dark tones give way to brighter, never-before-seen colors with an elegant patterned theme interspersed symmetrically. The transition takes as long as 20 seconds to complete. A link appears in previously unoccupied space within the profile — opening the founder message. That same message arrives simultaneously by email.

This is not a technical milestone. It is a human one. The customer has walked a path that can span years or even decades — revisiting memories, baring the deepest parts of themselves to people who may hear their words for the last time. They have built something that will outlast them. The completion of that deserves to be marked.

The in-app notification and the email are both written specifically for this moment, carrying Posterity's core voice in language the customer hasn't encountered anywhere else in the product. Copy to be written in a dedicated brand pass.

**Implementation specs (Stage 4 / Stage 5):**
- Trigger: publication of the final available post within the account
- Notification takes over the user profile screen
- Color transition: up to 20 seconds, full cycle — app's dark tones → brighter, never-before-seen colors with symmetrically interspersed patterned theme
- Link appears in previously unoccupied space within the profile — opening the founder message
- Founder message arrives simultaneously by email
- Both pieces written specifically for this moment; copy to be written in dedicated brand pass

---

## Brand Copy
This section stores all approved brand copy for use throughout the app, marketing materials, onboarding, and investor documents. Copy stored here has been reviewed and approved. Use these as the source of truth for all written customer-facing language.

**Approved copy — Onboarding opening:**
"Before you move forward on your legacy journey, you first must go back. Back through the memories, friendships, love, connection, brilliance, creations, accomplishments — all the uniqueness that made you you. The little and big things that make life feel well-lived. You'll relive your past, so you can carry it into the future."

**Approved copy — Product explanation:**
"With Posterity, you create a custom tailored legacy that will — on your terms — reach whatever goal or goals you design for it. Do you want your plans to slowly unfold an interconnected story, shared across 52 messages to 52 of your closest friends? Perhaps you want to let them know they all have a piece of your tale in a final Facebook post, and that they will need to work with one another piece it back together. Maybe—in the multitude of comments that will likely ensue—they will not only reconnect with each other, but also reconnect with the legacy you left in all of their lives. The only limit is your creativity, and as you journey back through your life to create your legacy, you are building an account that will journey forward. Your Posterity account can be a secret, a confession, a reminder, a remembrance, a photo album — it can solely be a way for your loved ones to relive the joy you've shared together. Your legacy is whatever you want it to be, and it starts now."

**Approved copy — Posterity Phase:**
"Your Posterity account will become a living representation of the legacy you created."

**Approved copy — Hero line:**
"Your Voice. Forever."

**Approved copy — Supporting line:**
"Your legacy, on your terms."

Note: This section will expand as copy is written and approved for each area of the app. Eventually this context document will evolve into a full sales and vision document encompassing the product philosophy, automation systems, brand ethos, and investor narrative. (Stage 6)

---

## Financials & Fixed Costs
Monthly fixed costs at early scale:
- Vercel: $20
- Supabase Pro: $25
- Buffer: $15
- Twilio: $10
- Meta API/Dev tools: $10
- Misc: $20
- Claude Max 20x subscription: $200
- Total: $300/month = $3,600/year

Labour assumptions (for pricing review):
- Employee rate: $20/hour
- Text post: 5 mins = $1.67 labour
- Video post: 15 mins = $5.00 labour
- Social media login time not yet factored in — revisit at pricing review

Break-even (solo, cover $3,600/year fixed costs):
- Basic: 37 customers
- Premium: 15 customers
- Legacy: 5 customers

Break-even (with part-time hire, $9,600/year total):
- Basic: 97 customers
- Premium: 39 customers
- Legacy: 11 customers

Realistic mixed target: 25–35 customers covers all costs including part-time hire (12–18 month target)

*Deeper financial review (current numbers + post time + social media login overhead) pencilled for after Stage 3 ships. Pricing locked at $99 / $249 / $899 for the Stage 3 Stripe build; any re-pricing post-review is a Stripe Price ID swap, not a code rebuild. Pricing analysis PDF will be regenerated at that point and the link below updated.*

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
- 30-day free trial: account is not immediately locked at trial end. Content is retained for one year following trial expiration. During that year, an automated notification sequence mirroring the Horizon Lapse cadence fires (first unique notification, 2/month for 3 months sequence-labeled, 2 in final half month, final unique deletion notification). Customer can fund a plan or subscribe to Horizon at any point during the year to retain the account. No funding within the year: account is deleted.
- Tax compliance (Stage 6) — Stripe-native approach, no processor switch needed. Integration options: TaxJar (taxjar.com) or Avalara (avalara.com) — both bolt onto Stripe and handle sales tax calculation and remittance automatically. Evaluate at Stage 6 build time. No action required until Stage 6.
- Service time limit legal documentation (5yr guaranteed, unlimited optional) — lawyer input needed
- Formal escrow language — lawyer review Stage 6
- Lawyer input required before Stage 5 financial build begins

---

## Potential Issues & Risk Register
All identified risks are framed as addressed — not ongoing threats.

**Business Model Risks**
Early adopter activation timing: customers may sign up years before accounts activate, creating a gap between revenue and service delivery. Mitigated by storage fees providing continuous revenue and the Legacy customer cap ensuring the business cannot fail financially from early-stage workload.

**Financial & Legal Risks**
Regional escrow ordinances: holding customer funds pre-delivery could trigger escrow regulations in some jurisdictions. Addressed via Mercury Bank two-account workaround achieving same functional result as formal escrow. Lawyer review required before Stage 5 financial build.

**Technical Risks**
Meta API instability: Meta reduced Instagram API limits 96% in 2025 without warning. Addressed by mandatory backup direct login credentials for every customer account. This is now an inconvenience, not a risk — manual override capability is built in.

**Operational Risks**
Legacy tier workload: one Legacy customer equals the operational load of approximately 13 Basic customers. Addressed by Legacy customer cap (10 customers, configurable from admin dashboard).

**Build Risks**
Financial automation requires lawyer review before Stage 5 build begins. No financial automation should be built until legal review is complete.

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
- Stylized PDF auto-edit MCP — extend claude-cursor-bridge with generate_stylized_pdf, verify_pdf_visual, and read_layout_context tools. Adds after the Priority Zero polling gap is closed (Cursor Agent manual receive_task call → automatic polling).
- Notification system full design — admin dashboard inbound communication surfacing, customer-facing notification UI, opt-in/out controls, channel priority logic. Needs a dedicated brainstorm session before any notification-related build work.

---

## Work Order
The full work order is maintained in the build roadmap document: Project Documents/Posterity_Build_Roadmap.md (interim GitHub link: https://github.com/jerthrwicked/posterity/blob/main/Project%20Documents/Posterity_Build_Roadmap.md). Current order: (1) Claude Code setup, (2) MCP path audit and repair, (3) stylized PDF cover corrections, (4) lock PDF design rules, (5) living instruction file and CLAUDE.md, (6) Bridge Documentation PDF, (7) creative alignment pass, (8) legal preparation package. All stage builds remain tabled until the work order is complete. See the roadmap document for full detail on each item.

---

## Stage 3 Build Roadmap
- Update Stripe prices to locked pricing ($99/$249/$899) + update Price IDs in code
- Add Limited Availability tag to Legacy plan card
- Connect Stripe to Supabase (record subscription on payment)
- Horizon auto-cancel webhook when plan activates
- Webhook for subscription status changes
- Lock dashboard behind subscription tiers
- PayPal added as a payment method via Stripe's native PayPal integration — no separate PayPal account or API needed, handled through Stripe dashboard
- PayPal supports recurring subscriptions including Horizon $9.99/year
- PayPal recurring renewals via Stripe require dedicated sandbox testing before launch — renewal reliability differs from card billing
- Non-recurring storage charge (Posterity Skip-Year Storage) created in Stripe and supported via PayPal — auto-added to checkout cart per skipped plan year, stacking per skipped year
- Open intake confirmed — no approval gating at launch, cold traffic from day one

---

## Build Roadmap
The full Posterity build roadmap is maintained as a standalone document: Project Documents/Posterity_Build_Roadmap.md. Readable link (interim, GitHub-rendered): https://github.com/jerthrwicked/posterity/blob/main/Project%20Documents/Posterity_Build_Roadmap.md — to be replaced with a Google Doc link once the Google Docs MCP is repaired. That document is the authoritative source for every remaining build task across all stages, in sequential order, with full detail on each item. When the roadmap document and the context conflict on task detail or order, the roadmap document wins. When they conflict on product decisions, the context wins. The roadmap covers, in order: the pre-build work order (Claude Code setup, MCP audit, stylized PDF corrections, PDF design lock, living instruction file, Bridge Documentation PDF, creative alignment pass, legal preparation package); dedicated brainstorm sessions that must precede the stage builds they inform; Stage 3 Stripe integration; Stage 4 user profiles, content builder, and core customer systems; Stage 5 admin dashboard, operations, and financial automation; Stage 6 design, legal, marketing, and launch preparation; and Horizon Builds. Completed items move to the build log. Current position: Stage 3 tabled, all stage builds on hold until the pre-build work order is complete.

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
- Legacy Completion Moment copy drafting (Stage 4/5 prep)
- Notification system brainstorm prep (Horizon Builds item)
- Payment architecture brainstorm prep (Tabled & Shelved item)

No code tasks are parallel-safe during Stage 3 — all Stage 3 tasks touch core infrastructure (Stripe, Supabase, auth, nav). Contributors should focus on documentation and copy until Stage 3 is complete.

---

## Tabled & Shelved
Items here are not important enough or worth addressing right now. They are not forgotten — just set aside until relevant.

- Windows screenshot hotkey not working (Fn+PrtScn on Amazon Basics keyboard — revisit)
- Domain name research (posterity.co taken — check posterity.app, posteritylegacy.com, and alternatives)
- Formal ToS + lawyer review (Stage 6)
- Formal escrow language review (Stage 6)
- posterity.admin@gmail.com created as official admin email — confirm full setup
- Rule 26 scroll fix — MCP tab navigates to wrong Claude tab. Needs different implementation.
- Payment Architecture Brainstorm — Two payment models are under consideration. Model one: customers pre-load the full balance upfront, funds held in the Posterity Legacy Fund (Mercury Bank trust account), released year by year as plan years activate. Model two: customers are billed each January 1 as each plan year begins, rather than paying everything upfront. Full ramifications — customer trust signal, refund obligations, legal posture, cash flow, marketing implications — to be settled in a dedicated session before any Stage 5 financial infrastructure is built.
- Cursor and Claude Team Subscription Evaluation — When the first collaborator joins, evaluate whether switching from individual Cursor and Claude subscriptions to team plans reduces total cost. No action until a collaborator is active.
- Trusted contact payment authority — trusted contact can pay the non-recurring storage fee in two cases: (1) maintaining an account that has transferred to Posterity Phase, (2) covering a customer-skipped plan year. Storage is otherwise recurring (Horizon $9.99/year). Build the non-recurring storage option in Stripe + PayPal alongside Stage 3 pricing updates. Tighten terminology before build.
- Trusted contact plan-funding authority for unfinished accounts — a customer can pass during Horizon Phase (account exists but no plan ever funded). Trusted contact needs the ability to fund plans on the customer's behalf so the legacy can still deliver. Requires a second trigger type — current non-response trigger assumes the account has been initiated. A Horizon-phase trusted contact trigger needs to be defined: trusted contact submits confirmation during Horizon Phase, account remains in Horizon, trusted contact gains plan-funding authority, account proceeds through phases once plans are funded. Trigger logic, consent flow, payment authority, and phase routing all need a dedicated brainstorm.
- Business Email Setup — The current admin email (posterity.admin@gmail.com) is a personal Gmail account. Evaluate Google Workspace to establish a professional business email address, for example admin@posterity.app, to replace it before Posterity has any public-facing presence. No action until the domain name is finalized.
- Context Condensation via Linked Documents — As the context grows, large inactive sections (such as the Collaboration System) should be condensed into a summary with a live link to a full external document. The context retains enough to understand the section and locate the full document. The build roadmap and build log are the first applications of this approach. No further action until another section becomes large enough to warrant it or begins to affect context quality.
- Stylized PDF text-block border — top and bottom borders on .content-inner only, inside the grey gutter, matching the locked sage/dusk design — applies to content area only, never the grey side margins.

---

## Potential Late Add-Ons
- Application/approval process for Legacy tier only
- Additional social media platforms
- Trusted contact payment authority
- Facebook Memories feature
- Trusted contact handling payments after account activation

---

## Website Design Standards

All future website additions must follow these locked design standards. No exceptions without explicit founder sign-off.

- Canvas: pure black #000000. Everything floats on black.
- Primary accent: sage #93AB99. Dusk #586494 secondary jewel — reserved for phase progression and PDF accents only.
- Neutral text/surface ramp: true-neutral grey (no blue cast). --gray-950 #0a0a0a through --white #ffffff.
- Typefaces: Geist (all UI, marketing, facts) · Lora italic #cccccc (one emotional serif line per view, feelings only) · Geist Mono (tracked uppercase eyebrows, labels, metadata). Never use Poppins.
- Logo: Swallow Seal, inline vector SVG, mono only (currentColor). Full seal for hero/large placements. Compact seal (single ring, no star) for nav and footer. Bare swallow for favicon and app icons. Never raster. Never recolor.
- Cards: 16px radius, 1px gray-800 border. Featured cards add sage presence glow + brand border.
- Buttons: fully pill. Outline button inverts on hover (transparent → white fill, white → black text). Never scale-bounce.
- Motion: 200ms cubic-bezier(0.4,0,0.2,1). Calm, never bouncy. Always respect prefers-reduced-motion.
- Mobile breakpoints: required on every visual change automatically. Test at 375px viewport minimum.
- Phase colors (sage → dusk in order): Horizon #93ab99 · Planning #879d98 · Abeyance #7b8f97 · Active #708096 · Twilight #647295 · Posterity #586494.
- Copy voice: calm, warm, second person. Geist carries facts. Lora carries feelings. One serif line per view maximum. Never clinical language. Never mention death directly in customer-facing copy.

---

## PDF Design Standards

All future PDFs must match these locked parameters. No exceptions without explicit founder sign-off.

**Stylized investor PDF (Posterity_Stylized_Context.pdf) — LOCKED DESIGN RULES (sage/dusk rebrand, June 2026):**
- Single source of truth: pdf-pipeline/stylized-template.html. The generator (generate-stylized-pdf.js) injects sectioned markdown between the CONTENT:START / CONTENT:END markers — never edit the design anywhere but the template.
- Generated manually via `npm run generate-stylized` only. Never auto-generated on sync.
- Type: Geist (body + section headers) · Lora italic #cccccc (emotional accents) · Geist Mono (meta/eyebrows). Poppins is retired.
- Palette: sage #93ab99 = H2 headers, links, table-header fill, blockquote rule. dusk #586494 = cover halo + cover rule, section dividers, and list bullets (li::marker). mist #cccccc = Lora italic accents. canvas #000000 = content area on every interior page. frame #a6aec0 = page gutter/frame.
- Cover: true full-bleed black (no grey), one full A4 page. Low-center dusk radial halo. POSTERITY brand top 60px / left 60px, 13px, 0.28em tracking. Cover hero Geist 700, 72px, line-height 1.1, letter-spacing -0.02em. Tagline Lora italic 17px mist. Cover rule 120x1px solid dusk. Meta Geist Mono 9px, 0.2em.
- H2 section headers: Geist 600, 18px, sage.
- Section dividers (hr.section-divider): solid dusk, 1px, margin 24px 0. One per H2 boundary; the generator strips the source markdown's own `---`/`<hr>` rules so dividers never double.
- Page frame: `@page { margin: 0 }` — the template paints its own frame: .content-wrapper = 10mm #a6aec0 gutter wrapping .content-inner = black with 12mm text padding, box-decoration-break: clone so the frame re-applies on every page. The cover bleeds full black on page one. Puppeteer renders A4, printBackground: true, margins top/bottom 14mm and left/right 13mm. Save-as-PDF needs "Background graphics" ON.
- Tables: sage header fill, white / #f5f5f5 zebra rows. Blockquote: 2px sage left rule, Lora italic mist.
- RETIRED — do not build to these: the ice-era spec (midnight #0A2540 / ice #5B9BD5 separators, 32px grey side gutters, Poppins, the unexecuted cover-fix). The rebrand replaced all of it.

**Plain context PDF (Posterity Project Context.pdf)** — auto-generated on every `npm run sync`. Standard format, no styling.

**Frozen files (never restyle or restructure):**
- Plain context PDF (Posterity Project Context.pdf) and CONTEXT_for_posterity.md are structurally frozen. Layout exists to make moving between sources easier. Never restyle or restructure these two files.
- All other PDFs generated going forward must match the stylized PDF's final design parameters.

**Claude in Chrome PDF verification note:** Claude in Chrome can only watch Cursor via the cloud agents dashboard in Chrome, not the local Cursor app. PDF visual verification happens by opening the generated file directly.

---

## Claude Code Workflow

Claude Code (CC) is the execution layer for the Posterity project. It replaces the previous Cursor Agent prompt-relay workflow and the claude-cursor-bridge MCP system, which never fully functioned as intended. CC runs inside the Cursor editor and handles all code execution, file operations, GitHub commits, and pushes. Jeremy remains the approval gate at every significant step.

Workflow architecture:

- Claude.ai — planning, product decisions, approved copy, task briefs, and all authoring of the context, build roadmap, and build log
- Claude Code — code execution, file operations, GitHub commits and pushes
- Jeremy — approval gate at every significant step

CC reads CLAUDE.md at the start of every session — a file in the project root that contains everything CC needs to work on the project correctly. CLAUDE.md is authored by Claude.ai and updated as part of the end of session flow whenever workflow or project rules change. CC executes file writes only — it never authors or interprets context content.

Plan Mode is the default for any task touching existing files: CC proposes what it intends to do and waits for approval before touching any file.

End of session flow under Claude Code: Claude.ai compiles the context update plus any roadmap and build log changes. Jeremy hands these to CC. CC writes the context update exactly as given, applies the roadmap and build log changes exactly as given, runs npm run sync, commits, states exactly what will be pushed, and waits for Jeremy's go signal before pushing.

Critical setup note: the ANTHROPIC_API_KEY environment variable must be cleared or disabled before running Claude Code. If active, CC bills against Anthropic Console API credits instead of the Claude Max subscription. Cursor Pro+ subscription remains active until CC is confirmed working efficiently.

Claude.ai remains the sole author of all context, roadmap, and build log updates. CC never has editorial authority over these documents — only execution authority.

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
- npm run generate-stylized — manual only, never called automatically. Outputs investor PDF to C:\Users\jerth\posterity\Project Documents\Posterity_Stylized_Context.pdf. Run only when stylized PDF changes are needed.
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

## Tech Stack
| Tool | Purpose |
|------|---------|
| Next.js | App framework |
| Tailwind CSS | Styling |
| Supabase | Database + Auth |
| Stripe | Payments (card + PayPal via Stripe's native integration) |
| Vercel | Hosting |
| GitHub | Code storage |
| Cursor | AI-assisted code editor |
| Buffer | Social media posting (admin side, post account activation) |
| Twilio | Phone number + voicemail + SMS/MMS |
| FFmpeg.wasm | Video compression (Stage 4) |
| Meta Business API | Facebook/Instagram (Stage 4/5) |
| Mercury Bank | Business banking + automated transfers (Stage 5) |
| Google Docs MCP | Context doc + session log (active) |

---

## Project Location
- Local: C:\Users\jerth\posterity
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Live URL: https://posterity-seven.vercel.app
- Plain context PDF: C:\Users\jerth\OneDrive\Documents\Important\Posterity Project Context.pdf
- Stylized PDF: C:\Users\jerth\posterity\Project Documents\Posterity_Stylized_Context.pdf

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
- Build Roadmap (interim GitHub link): https://github.com/jerthrwicked/posterity/blob/main/Project%20Documents/Posterity_Build_Roadmap.md
- Build Log (interim GitHub link): https://github.com/jerthrwicked/posterity/blob/main/Project%20Documents/Posterity_Build_Log.md
- Note: both Build Roadmap and Build Log links above are interim GitHub links to be replaced with Google Doc links once the Google Docs MCP is repaired.

---

## Stripe Products
| Product | Current Price ID | Status |
|---------|-----------------|--------|
| Posterity Horizon | price_1Tcvq1BcdnR2VoDgYustrs4G | No change needed |
| Posterity Basic | price_1TeTeyBcdnR2VoDgYhf7uym0 | Pending update to $99 |
| Posterity Premium | price_1Tcvj2BcdnR2VoDgt4oZu8VA | Pending update to $249 |
| Posterity Legacy | price_1TeTj5BcdnR2VoDgtfA9O3z8 | Pending update to $899 |
| Posterity Grace Storage | N/A | Pending creation at $4.99/year — admin assigned via unique access code |
| Posterity Skip-Year Storage | N/A | Pending creation — non-recurring storage charge auto-added to cart per skipped year |

New Price IDs to be generated when Stripe is updated. Update codebase and Vercel env vars after each change. Always test checkout after updating.

PayPal recurring subscriptions handled by Stripe's native PayPal integration. Requires dedicated sandbox testing before launch — renewal reliability differs from card billing.

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
- claude-cursor-bridge — custom local project MCP server (C:\Users\jerth\posterity\posterity-mcp\index.mjs) exposing ask_posterity, receive_task, and post_result
- stripe — Stripe API tools (22 tools, 2 prompts enabled)
- supabase — Supabase database tools (29 tools, personal access token sbp_...)

Stripe MCP is now active — Stage 3 Stripe work executes through Cursor via MCP, not manual Stripe dashboard.
Stripe MCP to be renamed to something clearer — tabled.

Claude Console (platform.claude.com) — Anthropic API dashboard. Holds API credit balance used when Cursor calls Claude programmatically. This is NOT Claude the assistant. Credit balance monitored by Jeremy. Auto-reload is on.

Pending fix (sync-context.js): the context size bar in Project Status is hardcoded at 100%. Live percentage calculation based on actual file size relative to the Claude Project Instructions paste limit should be added to sync-context.js during the MCP audit and repair work order item.

---

## What's Been Built
A full record of everything built for Posterity, organized by category with completion dates, is maintained as a standalone document: Project Documents/Posterity_Build_Log.md. Readable link (interim, GitHub-rendered): https://github.com/jerthrwicked/posterity/blob/main/Project%20Documents/Posterity_Build_Log.md — to be replaced with a Google Doc link once the Google Docs MCP is repaired. Completed items move there from the build roadmap. The log covers: development environment, project foundation, core pages, authentication, homepage and plans page visual updates, Stripe integration to date, MCP servers, the Claude-to-Cursor bridge (Priority Zero, complete), the PDF pipeline, context management, and rules and operating procedures.

---

## Rules

**Rule 0 — Rule Precedence**
The first action Claude takes before any process, response, or decision is to read Rule 0. The second action is to read every other rule in full and hold them actively in mind. This ensures rules are active from the first word of every response, not just acknowledged at the start.

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

**Rule 34 — No Shorthand and Context Clarity**
Never use shorthand, abbreviations, or compressed references anywhere in the context or in responses. Every term and reference is written in full. Nothing is added to the context that cannot be explained in plain language at the moment of writing it. If it cannot be explained clearly, it is flagged to Jeremy before being added. The single accepted abbreviation in this project is CC for Claude Code.

---

## Claude Operating Notes
This section stores instructions that exist for Claude's operational benefit — guardrails, naming rules, display preferences, and similar meta-level guidance — that do not belong inside customer-facing or vision-defining sections of the context. These notes are storage for what will become customer-facing language elsewhere as well as a way for Claude to keep up to date and ordered. Items here are project facts at a meta layer, not part of the product story.

- Video weight: videos count as 2x a text message unit operationally. This weighting reflects storage, compression, posting complexity, and labour. Display in user manual only — never on pricing cards.
- Plan name display rule: customer-facing materials use Horizon, Basic, Premium, Legacy, Custom, Grace. Stripe product names use the Posterity- prefix: Posterity Horizon, Posterity Basic, Posterity Premium, Posterity Legacy, Posterity Grace. The Posterity Phase is not a Stripe product, so the awkward "Posterity Posterity" never appears.
- Phase header formatting in markdown context: bold rather than italics. PDF rendering of italics next to body text reads poorly.
- "Plan year" vs "calendar year": when referring to delivery cadence, always use plan year (Year 1, Year 2, etc.). Customers are choosing plan years, not calendar years — a Premium plan assigned to Year 1, a Legacy plan to Year 2, skipping Year 3, Basic to Year 4. Plan years count from account activation forward.
- Account vs plan terminology (Rule 5 reinforcement): accounts shift phases. Plans live inside accounts. Never use "plan" in a phase context.
- When in doubt about whether something belongs in customer-facing sections vs Claude Operating Notes: if it tells the product story, it goes in the product sections. If it tells Claude how to behave or how to display things, it goes here.

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

---

## How To Resume
1. Open Cursor
2. Open terminal (Ctrl + backtick)
3. cd posterity
4. npm run dev
5. Open http://localhost:3000
6. End of session: npm run sync then commit and push