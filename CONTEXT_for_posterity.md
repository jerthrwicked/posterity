# Posterity - Project Context
Last Updated: June 2026

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after they are gone. A digital time capsule with a subscription model. Posterity posts content on behalf of customers to their chosen delivery platforms after plan activation.

## Subscription Tiers (LOCKED June 2026)
| Tier | Price | Messages | Video |
|------|-------|----------|-------|
| Horizon | $9.99/year | None | None |
| Basic | $99/year | 4 per year (quarterly) | 1 per year |
| Premium | $249/year | 12 per year (monthly) | 4 per year |
| Legacy | $899/year | 52 per year (weekly) | 12 per year |
| Custom | Contact Us | Custom | Custom |
| Grace | Contact Us | 1-2 messages | None |

All message tiers include optional handwritten note per message.
Videos weighted at 2x a text message unit (operational cost rationale — do NOT display on pricing cards, include in user manual only).
Plan names on site/customer-facing materials: Horizon, Basic, Premium, Legacy, Custom, Grace.
Plan names in Stripe only: Posterity Horizon, Posterity Basic, Posterity Premium, Posterity Legacy, Posterity Grace.

## Plan Lifecycle & Phases
Posterity plans move through four distinct phases. This language appears throughout the product, the onboarding walkthrough, and all customer-facing materials. It is a core part of what makes Posterity unique — clinical terminology is removed entirely. The system responds only to events and dates, never to the customer's passing itself.

**Key Terms:**
- **Initiated** — a plan that has been paid for and exists in the system. When a customer pays for their plan they are said to have initiated it. Initiation is the act of funding a plan and bringing it into the Posterity system. Upon initiation, the customer enters the Planning Phase and the check-in system begins.
- **Non-response trigger** *(internal term only)* — the system event that moves a plan into Abeyance. Occurs in one of three ways:
  1. Check-in goes unanswered after all 6 notifications
  2. Trusted contact submits confirmation through their portal
  3. Customer manually moves their plan into Abeyance using the "I'm Ready" option. The system responds only to events — never to the customer's passing itself.
- **Abeyance** — the intentional waiting period between the non-response trigger and plan activation. Content is ready but not yet delivered. The bereaved are given time to process their loss.
- **Active** — the plan is delivering content according to the customer's calendar. Activation occurs automatically on January 1 following the plan entering Abeyance.

**The Four Phases:**

*Phase 1 — Horizon (Building Phase)*
The customer has subscribed to Horizon at $9.99/year. They are actively building their legacy — uploading content, setting up their calendar, and selecting the plan tiers they intend to initiate. Multiple plans can be built and worked on simultaneously via a side menu in the dashboard. There is no time limit on this phase. The Horizon subscription covers storage for as long as the customer remains in this phase.

*Phase 2 — Planning Phase (Post-Initiation)*
The customer has paid for their plan(s) (initiated). The plan now exists, is funded, and content continues to be refined. The customer continues their regular 6-month check-ins. This is typically the longest phase — it lasts from the moment a plan is initiated until the non-response trigger fires or the customer manually moves their plan into Abeyance, potentially spanning years or decades.

*Phase 3 — Abeyance*
A trigger event has occurred — either the non-response trigger has fired or the customer has manually moved their plan into Abeyance using the I'm Ready feature. The plan is now in a waiting state. No content is delivered during this phase. This is intentionally brief — lasting until the following January 1, a maximum of approximately 11 months. This grace period reflects one of Posterity's core values: the bereaved deserve time to process before their loved one's plan enters its Active Phase.

*Phase 4 — Active Phase*
January 1 has arrived. Content delivery begins according to the customer's calendar. The system automatically generates that year's delivery schedule and posts content on the dates the customer set. This phase repeats annually for each plan year initiated.

## Core Values
**Compassion over convenience**
Content delivery begins January 1 of the year following a plan entering Abeyance — not immediately after the trigger event. The bereaved deserve time to grieve before receiving scheduled content. Posterity prioritizes emotional readiness over technical immediacy.

**Life chapters, not dates**
Most services think in calendar dates. Posterity thinks in life chapters. A plan's year counter does not start when a customer signs up — it starts when their legacy begins for others. A customer who signs up in 2026 and whose plan enters Abeyance in 2034 gets a full Year 1 starting January 1 2035. Plans are organized by years of plan, not calendar dates. Two timelines are tracked: payment timeline and delivery timeline.

**Trust through transparency**
No employee ever touches customer funds directly. All financial movements are automated with full audit trails. Customers can trust that their legacy investment is protected.

**Accessibility without compromise**
Financial hardship options ensure everyone can leave something behind regardless of means. A legacy should not be a luxury.

**Control until the end**
Customers can build, test, preview, and adjust their legacy content at any time before their plan enters Abeyance. Nothing is set in stone until they are ready. Customers also have the option to manually move their plan into Abeyance on their own terms using the "I'm Ready" feature.

## Plan Year System
- Plans counted in years (Year 1, Year 2, Year 3) not calendar dates
- Year 1 begins January 1 of the calendar year following plan entering Abeyance
- Payment timeline and delivery timeline tracked separately
- The Horizon storage fee ($9.99/year) applies throughout both the Building and Planning phases — from signup through all years in which no active plan year is delivering content. Storage fees are not limited to the pre-initiation period.
- Customers can pay for multiple years upfront
- All plans in a customer's Horizon account are built during the Building Phase and paid for together at initiation
- Calendar in user profiles built around real calendar dates tied to plan years
- Funds for Year 2 not accessed until Year 1 is complete
- Year-by-year fund release automated via server-side cron job
- Service limit: 5 years guaranteed from Horizon signup, unlimited years optional (best effort, no legal guarantee beyond 5)
- Needs further discussion with lawyer before building anything dependent on long-term service obligations

## Horizon Tier
- $9.99/year is a holding fee not a service fee
- Dual purpose:
  1. Inactive account storage — holds content and account data during any year in which no active plan delivery is scheduled, including years between active plan years
  2. Covers both the Building Phase (before initiation) and Planning Phase (post-initiation) storage needs
- Content stored but not delivered until plan enters Active Phase
- Recurring annual subscription
- Horizon subscription transitions into initiated plan upon payment
- Customers can upload content anytime during Horizon phase
- Customers can create and work on multiple plans simultaneously during Horizon

## Horizon Lapse Grace Period
If Horizon payment lapses:
- Via Twilio SMS: 2 notifications/month for months 1-3 (6 total)
- Via Twilio SMS: 2 notifications in final half month
- Via Twilio SMS: 1 final notification that account was deleted
- Total grace period: approximately 3.5 months before deletion

## Calendar System
- Plan Year 1 begins January 1 of the calendar year following plan entering Abeyance
- Intentional grace period: gives bereaved time to process before plan enters Active Phase
- Uses real calendar dates — no relative day counting
- Customers set real dates during calendar setup (anniversaries, birthdays, custom dates)
- System auto-generates annual delivery schedule every January 1
- Leap years handled automatically by real calendar
- When plan enters Active Phase, system takes most recent iteration of customer's calendar
- Each calendar entry = Supabase record: plan year, delivery date, content attached, delivery status
- Daily automated check triggers delivery when date matches
- Full automation possible with this model

## Check-in System (Planning Phase)
- Customer checks in every 6 months via email or SMS
- Missed check-in triggers 3-month warning period:
  - Via Twilio SMS + email: 2 notifications/month for 3 months (6 total)
  - Notifications sent to BOTH customer AND trusted contact
- No response after all 6 notifications: non-response trigger fires, plan moves into Abeyance
- This applies to Planning Phase customers only (separate from Horizon lapse system)

## Trusted Contact System
- Optional but strongly encouraged
- Customer adds trusted contact name and email in user profile during setup
- System automatically sends trusted contact an invitation to create their own Posterity portal account
- Invitation automatically resent every 6 months until accepted. Can also be resent manually via admin dashboard.
- Customer receives notifications alongside trusted contact reminding them that their trusted contact has not yet set up their account
- Customer receives notification when trusted contact accepts invitation and sets up their account
- If trusted contact never sets up their account the check-in non-response system still functions independently — trusted contact is optional
- Trusted contact portal is a separate login on the Posterity site, completely independent from customer account
- Trusted contact portal shows: their role, linked customer, notification history, confirmation button
- Trusted contact receives all 6 check-in notifications alongside customer during Planning Phase
- When trusted contact believes customer has passed: they log into their portal and submit confirmation
- Confirmation requires double verification (re-enter password + confirmation code sent to their email/phone) to prevent accidental triggering
- Once confirmed: non-response trigger fires, plan moves into Abeyance
- All plans within a customer profile move through phases together simultaneously — one customer, one phase progression
- Trusted contact payment authority: TBD, tabled for later discussion
- Trusted Contact page added to global nav dropdown for easy portal access

## Social Media Integration
- Platforms: Facebook and Instagram to start, gauge interest and expand later
- Meta Business API required for all scheduled posts
- Backup login credentials REQUIRED
- Individual unique passwords automatically generated by Posterity for each customer, stored securely in Supabase
- Customers are responsible for activating and maintaining their backup credentials prior to plan entering Abeyance. Failure to provide credentials is a breach of user agreement but will not cancel service.
- 2FA must be configured using Posterity-controlled backup email or Twilio phone number to ensure access post plan activation
- Buffer used by Posterity team post plan activation to post content to customer social media accounts. Direct platform login used as fallback.
- Posterity team posts on behalf of customers during Active Phase
- Facebook Memories feature: skipped for now, add later if needed (requires direct login)
- Monitor Meta API announcements as standing operational task
- Meta API risks:
  - Meta reduced Instagram limits 96% in 2025 without warning
  - Video: 10 calls/second cap vs 300 for text
  - Instagram caps API posts at 100 per 24-hour rolling window
  - Mitigation: backup direct login, manual override essential

## Video & Content Delivery
- Delivered via social media, text (MMS via Twilio), and email
- Hard limit: 25MB maximum, 720p minimum quality, 3-4 minutes maximum length
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

## Video Storage & Compression
- Storage via Supabase Storage (low cost at early scale)
- Client-side compression via FFmpeg.wasm at point of upload in user profile (Phase 4)
- Per-video limits: 25MB max, 720p min, 3-4 minutes max (enforced at upload)
- Total Supabase storage allocation per tier TBD at scale
- Upgrade path: Cloudflare Stream or Mux at scale
- Video weight explanation (2x units) goes in user manual only, not pricing cards

## Customer Contact & Communication
- Via Twilio: dedicated Posterity phone number with voicemail enabled
- Via Twilio: inbound customer contact for Build Your Own inquiries, general questions, Grace tier applications
- Via Twilio: outbound automated SMS notifications to customers (check-ins, alerts, delivery confirmations)
- Via Twilio: delivery of all forms of customer content including messages, videos (MMS), and secure links
- Via Twilio: secure video link delivery fallback if MMS carrier delivery fails
- No intermediary at launch, founder handles directly
- Posterity email account (Phase 5) — used for video delivery via link and responding to customer email inquiries

## Financial Architecture
- Customer pre-loads full balance upfront
- Funds held in Posterity Trust Account (internal name) / Posterity Legacy Fund (customer-facing name)
- Annual transfers from Trust Account to Posterity Operating Account triggered by server-side cron job at start of each plan year
- Mercury Bank recommended: free business checking, API access, sub-accounts, built for startups
- Mercury Bank two-account setup chosen as intentional workaround to avoid legal ramifications from regional escrow ordinances while achieving the same functional result as formal escrow
- No employee ever accesses funds directly — fully automated with audit logs
- Any automation failure triggers immediate admin dashboard alert: what failed, which customer, amount, timestamp, retry status
- Full audit trail for every transfer: timestamp, amount, customer ID, plan year
- Formal escrow deferred to Phase 6 — lawyer review required before Phase 5 financial build begins
- Stripe fees: ~2.9% + $0.30 per transaction — not material at early scale

## User Profiles (Phase 4)
- Calendar setup — customers set real dates (anniversaries, birthdays, custom dates) that feed the automation system
- Social media connection (Meta API + unique Posterity-generated backup credentials — required). 2FA configured using Posterity-controlled contact details.
- Video/photo/message upload with FFmpeg compression
- Previews of all uploaded images, videos, and messages displayed within each plan's building dashboard so customers can review their content at any time
- Live cart top right of dashboard (above dropdown nav) — shows all plans currently being built with total cost, storage fee, and next payment date as a permanent separate line item. Updates in real time. Persists across sessions.
- All plans currently being built are automatically in the cart. Customer pays once for all plans simultaneously — full upfront payment.
- Plan deletion automatically removes cart item. Deletion triggers confirmation: "Are you sure? This will permanently delete all work on this plan and cannot be undone."
- Trusted contact setup — enter name and email, system sends invitation, customer confirms acceptance and receives notification when trusted contact sets up their account
- Check-in preferences — we recommend enabling both email and SMS notifications for maximum reliability, along with trusted contact details for check-in alerts
- Remaining messages/videos ticker
- Assurance that money not withdrawn until plan enters Active Phase
- Multi-plan side menu — customers can create and work on multiple plans simultaneously. Each plan displays its current phase clearly.
- "I'm Ready" button (Don't want to wait for the unexpected? Use this option to manually transition your plan into Abeyance and begin your legacy journey on your own terms.) Requires double verification to prevent accidental triggering.
- All automated and set up to notify Posterity team

## Onboarding & Walkthrough (Phase 4)
- Step-by-step onboarding walkthrough triggered on first login
- Onboarding FAQ available within the app for reference after initial walkthrough
- Explain the four plan phases (Horizon, Planning, Abeyance, Active) during onboarding
- The four phases should feel like a natural, fluid progression to the customer — not a technical system. Each phase mirrors a stage of their own end of life journey: building their legacy, living with it in place, the quiet waiting, and finally the moment their voice reaches the people they love.
- Phase language displayed in user profile dashboard so customers always know which phase their plan is in
- AI chatbot for customer setup guidance, product explanations, and general questions
- Encourage customers to double-check and test everything before finalizing
- Explain video storage and posting has higher workload (2x unit weight) — in walkthrough/manual only

## Build Your Own & Grace
- Grace plans are available for those facing financial hardship. A consultation with a Posterity rep is required.
- Grace customers pay a reduced storage fee of $4.99/year (Posterity Grace Storage — separate Stripe product, admin-assigned via unique access code generated after consultation). This reduced rate is a potential future branding win — could be positioned publicly as a signal of Posterity's commitment to accessibility during Phase 6 marketing review.
- Grace customers should have their 1-2 messages built before contacting Posterity
- Grace plan details and guidance included in onboarding FAQ only — not in main onboarding flow
- For Grace plans: admin initiates the plan on behalf of the customer after consultation
- Grace and Custom customers follow the same phase progression as standard customers — Planning Phase into Abeyance with full trigger system. Custom parameters set by admin determine their posting schedule. Once parameters are set the automated system treats them identically to standard accounts.
- For Custom (Build Your Own) plans: admin sets custom account parameters first, customer builds content after parameters are established following contact. Customer initiates but plan goes straight to Planning Phase — no standard Horizon building phase.
- Manual input panel in admin dashboard required for both Grace and Custom account setup
- Custom and Grace tiers use Contact Us buttons on pricing page — no public checkout. Grace storage fee ($4.99/year) is a separate Stripe product assigned by admin after consultation via unique access code. No public-facing checkout for Grace storage.

## Admin & Operations (Phase 5)
- Operational dashboard: all tasks in priority order
- Financial dashboard: completely separate from operational
- No employee access to customer funds — audit logs only
- Automated year-by-year fund release via server-side cron job (Mercury Bank)
- Admin dashboard alerts for any automation failures
- Manual input panel for Build Your Own and Grace accounts
- Manual override Post Manually button for API failures and general posting workarounds
- Ability to process multiple posts simultaneously
- Via Twilio: voicemail notifications
- Test account option post-launch
- Standing task: monitor Meta API announcements

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

Realistic mixed target: 25-35 customers covers all costs including part-time hire (12-18 month target)

Full pricing analysis: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing

## Legal & Compliance
- Formal Terms of Service before launch (lawyer review)
- Copyright application
- Liability FAQ: Posterity not responsible for customer failure to meet standards of operation
- Standards of use FAQ required
- Refund policy: unspent years refunded ONLY if company closes OR delivery proves unfeasible AND customer met required standards of operation and compliance as outlined in contract
- Tax compliance (Phase 6)
- Service time limit legal documentation (5yr guaranteed, unlimited optional) — lawyer input needed
- Formal escrow language — lawyer review Phase 6
- Lawyer input required before Phase 5 financial build begins

## Marketing
- Core angle: life chapters not dates
- Hero line: "Your voice. Forever."
- Supporting line: "Your legacy, on your terms"
- The four plan phases are a core brand differentiator and selling point. Phase language removes all clinical terminology from the product entirely and should be prominent in marketing materials, the onboarding walkthrough, and the user dashboard.
- January 1 delivery start is a marketing and trust-building point — Posterity is thoughtful about when content is delivered, not just that it is delivered. Content lands when our customers decided their recipients would be ready to receive it, not in the immediate fog of grief.
- Upgrade savings story: more messages/videos = lower cost per unit
  - Premium saves 24.5% vs Basic rate
  - Legacy saves 28.3% vs Basic rate
- Sales sheet + investor growth projections + break-even by user numbers (Phase 6)
- Testimonials section: user videos, text, accolades, articles — build after accruing content (Phase 6)
- Life insurance company partnership (post-launch opportunity)
- Gauge social media platform interest and expand beyond Facebook/Instagram as demand grows

## Design Phase (Phase 6)
- App appearance fine-tuning
- Logo design
- Claude design first, Canva as backup

## Potential Late Add-Ons (Tabled — not concrete)
- Application/approval process for Legacy tier only
- Additional social media platforms
- Trusted contact payment authority
- Facebook Memories feature
- Trusted contact handling payments after passing

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
| Buffer | Social media posting (admin side, post plan activation) |
| Twilio | Phone number + voicemail + SMS/MMS |
| FFmpeg.wasm | Video compression (Phase 4) |
| Meta Business API | Facebook/Instagram (Phase 4/5) |
| Mercury Bank | Business banking + automated transfers (Phase 5) |

## Project Location
- Local: C:\Users\jerth\posterity
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Live URL: https://posterity-seven.vercel.app

## What's Been Built
- Development environment (Node.js v24, Git, Cursor)
- Next.js project, Homepage, Login, Signup, Dashboard, Pricing pages
- Working Supabase authentication (email/password, confirmation OFF)
- PWA installed on Android
- Live on Vercel
- MCP servers in Cursor: GitHub MCP (26 tools) + Supabase MCP
- Cursor shell allowlist: npm, node, git, npx auto-approved
- Stripe sandbox account, 4 products created
- Pricing page with all 6 tiers, Stripe checkout working and tested
- Global nav in layout.js (dropdown, all pages)
- Homepage cards matching pricing cards
- sync-context.js + npm run sync for end-of-session context updates
- Project Documents folder created in project root
- Cursor Pro subscribed (Sonnet 4.6 for daily use, Opus 4.8 for complex tasks)

## Environment Variables
Set in both .env.local and Vercel:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_SITE_URL=https://posterity-seven.vercel.app

## MCP Setup
- Config: C:\Users\jerth\posterity\.cursor\mcp.json (in .gitignore)
- GitHub MCP: personal access token, no expiration
- Supabase MCP: personal access token (sbp_...)
- Stripe MCP: to be added when Stripe goes live

## Session Workflow
- Brainstorm and plan in Claude.ai
- Claude.ai writes prompts for Cursor Agent (Sonnet 4.6)
- Cursor Agent writes and pushes all code
- End of session: paste "Update CONTEXT_for_posterity.md with everything we worked on this session, then run npm run sync to copy it to Documents and regenerate the PDF, then commit and push everything to GitHub with an appropriate commit message" into Cursor Agent
- g = go/approved, d = done

## Stripe Products (PENDING PRICE UPDATE)
| Product | Current Price ID (outdated) | Status |
|---------|----------------------------|--------|
| Posterity Horizon | price_1Tcvq1BcdnR2VoDgYustrs4G | No change needed |
| Posterity Basic | price_1TeTeyBcdnR2VoDgYhf7uym0 | Pending update to $99 |
| Posterity Premium | price_1Tcvj2BcdnR2VoDgt4oZu8VA | Pending update to $249 |
| Posterity Legacy | price_1TeTj5BcdnR2VoDgtfA9O3z8 | Pending update to $899 |
| Posterity Grace Storage | N/A | Pending creation at $4.99/year — admin assigned via unique access code |

New Price IDs to be generated when Stripe is updated. Update codebase and Vercel env vars after each change. Always test checkout after updating.

## Important Links
- Live site: https://posterity-seven.vercel.app
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Vercel dashboard: https://vercel.com/jerthrwicked/posterity
- Stripe dashboard: https://dashboard.stripe.com/test/dashboard
- Supabase dashboard: https://supabase.com/dashboard/project/vypytfmutmeyfwmkapjg
- Pricing analysis PDF: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing

## Phase Roadmap

### Phase 3 (Current) — 2-3 sessions (4-9 hours)
- Update Stripe prices to locked pricing ($99/$249/$899) + update Price IDs in code
- Update codebase and Vercel env vars after each Stripe change, always test checkout after updating
- Add Limited Availability tag to Legacy plan card
- Legacy customer cap: 10 customers, configurable from admin dashboard
- Rename Financial Hardship to Grace on pricing card, update description
- Connect Stripe to Supabase (record subscription on payment)
- Horizon subscription transition logic (transitions into initiated plan upon payment)
- Webhook for subscription status changes
- Lock dashboard behind subscription tiers
- Trusted Contact portal page + separate login + nav dropdown entry

### Phase 4 — 8-12 sessions (16-36 hours)
- User profiles (real-date calendar setup, content scheduling, social media setup)
- Multi-plan dashboard with side menu (create and work on multiple plans simultaneously)
- Live cart top right of dashboard showing all plans, total cost, storage fee, next payment date
- Plan deletion flow with permanent delete confirmation message
- All plans in Horizon auto-included in cart during building phase
- Onboarding walkthrough + onboarding FAQ + AI chatbot + first-login triggered walkthrough
- Four plan phases explanation in onboarding and dashboard
- "I'm Ready" feature (customer manually moves plan into Abeyance)
- Check-in system (6 month intervals, 3 month warning, 2x/month notifications via Twilio + email)
- Trusted contact system (optional portal, double verification confirmation, invitation flow, resend logic)
- Video upload + FFmpeg.wasm compression (client-side at upload)
- Video size/length validation (25MB max, 720p min, 3-4 min max)
- Remaining messages/videos ticker
- Video rollover to messages
- Multi-year cart system with storage fee calculation
- Meta Business API + Buffer integration
- Per-customer backup credentials (required, Posterity-generated, 2FA via Posterity-controlled contact)

### Phase 5 — 6-8 sessions (12-24 hours)
- Admin/operational dashboard (priority task list)
- Separate financial dashboard
- Mercury Bank two-account setup (Trust Account + Operating Account)
- Automated year-by-year fund release via server-side cron job
- Admin dashboard alerts for automation failures
- Manual input panel for Build Your Own and Grace accounts
- Grace access code generation system (unique codes for Grace storage fee assignment)
- Create Posterity Grace Storage Stripe product ($4.99/year)
- Manual override for API failures and general posting workarounds (Post Manually button)
- Simultaneous post processing
- Via Twilio: voicemail + outbound SMS notifications
- Posterity email account
- Audit logs for all financial movements
- Test account option
- Lawyer review before financial build begins

### Phase 6 — 4-6 sessions (8-18 hours)
- App appearance fine-tuning + logo design (Claude first, Canva backup)
- Tax compliance
- Terms of Service + lawyer review + copyright application
- Liability FAQ + Standards of use FAQ
- Refund policy finalization
- Formal escrow language review
- Testimonials section (after accruing content)
- Sales sheet + investor materials + growth projections
- Life insurance partnership exploration
- Service time limit legal documentation
- Grace Storage public branding review ($4.99 accessibility signal)

### Total Remaining: 20-29 sessions (40-87 hours)

## How To Resume
1. Open Cursor
2. Open terminal (Ctrl + backtick)
3. cd posterity
4. npm run dev
5. Open http://localhost:3000
6. End of session: npm run sync then commit and push

## Developer Notes
- Windows 11, PowerShell (no && between commands)
- Node.js v24.16.0, non-technical founder, all code by AI
- Owner: jerthrwicked (GitHub)
- g = go/approved, d = done
- File creation: use $content = @' ... then [System.IO.File]::WriteAllText() to avoid UTF-8 corruption
