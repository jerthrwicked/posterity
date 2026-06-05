# Posterity - Project Context
Last Updated: June 2026

## Pricing Analysis Document
Full pricing analysis PDF: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after death. A digital time capsule with a subscription model. Posterity posts content on behalf of customers to their social media accounts after death is confirmed.

## Core Values
**Compassion over convenience**
Content delivery begins January 1 of the year following death trigger activation — not immediately after passing. The bereaved deserve time to grieve before receiving scheduled content. Posterity prioritizes emotional readiness over technical immediacy.

**Life chapters, not dates**
Plans are organized by years of plan, not calendar dates. A customer's legacy begins when their story continues for others — not when they signed up.

**Trust through transparency**
No employee ever touches customer funds directly. All financial movements are automated with full audit trails. Customers can trust that their legacy investment is protected.

**Accessibility without compromise**
Financial hardship options ensure everyone can leave something behind regardless of means. A legacy should not be a luxury.

**Control until the end**
Customers can build, test, preview, and adjust their legacy content at any time before activation. Nothing is set in stone until they are ready.

## Core Differentiator
Plans are organized by YEARS OF PLAN not calendar dates. The year counter does not start until the death trigger is activated. A customer can sign up in 2026, pay for Years 1-3, pass away in 2034, and Year 1 begins January 1 2035. Two timelines tracked: payment timeline and delivery timeline. Key marketing angle: life chapters not dates.

## Business Model
- Annual upfront billing, one-off payment per year of plan
- Multi-year upfront option (Phase 4)
- Pre-loaded balance model: customer pays full amount upfront, Posterity withdraws only at start of each plan year, remaining balance untouched until each year activates
- No employee ever touches customer funds directly — all financial movements automated with audit logs
- 5 years guaranteed service from day customer starts building (Horizon signup date)
- Beyond 5 years: unlimited years allowed, best effort only, no legal guarantee
- Unspent years refunded ONLY if company closes OR delivery proves unfeasible AND customer met required standards of operation as outlined in contract
- Formal Terms of Service required before launch (lawyer review + copyright application)
- Pricing review at late stage build once time-per-post fully understood

## Subscription Tiers (LOCKED June 2026)
| Tier | Price | Messages | Video |
|------|-------|----------|-------|
| Horizon | $9.99/year | None | None |
| Basic | $99/year | 4 per year (quarterly) | 1 per year |
| Premium | $249/year | 12 per year (monthly) | 4 per year |
| Legacy | $899/year | 52 per year (weekly) | 12 per year |
| Custom | Contact Us | Custom | Custom |
| Financial Hardship | Contact Us | 1-2 messages | None |

All message tiers include optional handwritten note per message.
Videos weighted at 2x a text message unit (operational cost rationale — do NOT display on pricing cards, include in user manual only).
Legacy tier: add "Limited Availability" tag to plan card (Phase 3).
Legacy customer cap: 10 customers at launch, configurable from admin dashboard (Phase 3).
Stripe and live site prices still showing old prices ($39/$99/$299) — PENDING UPDATE next session.

## Stripe Products (PENDING PRICE UPDATE)
| Product | Old Price ID (outdated) | New Price ID |
|---------|------------------------|--------------|
| Posterity Horizon | price_1Tcvq1BcdnR2VoDgYustrs4G | No change |
| Posterity Basic | price_1TeTeyBcdnR2VoDgYhf7uym0 | Pending ($99) |
| Posterity Premium | price_1Tcvj2BcdnR2VoDgt4oZu8VA | Pending ($249) |
| Posterity Legacy | price_1TeTj5BcdnR2VoDgtfA9O3z8 | Pending ($899) |

New Price IDs to be generated next session. Update codebase and Vercel env vars after each change. Always test checkout after updating.

## Horizon Tier - Dual Purpose
1. Inactive account storage — for lapsed or paused plans
2. Legacy builder starter — build account before committing to full plan
- $9.99 is a holding fee not a service fee
- Content stored but not delivered until death trigger activated and full plan in place
- Recurring annual subscription
- Auto-cancels when customer upgrades to paid plan (webhook/Supabase logic required — Phase 3)
- Plans upgradeable from within user dashboard
- Customers can upload content anytime after subscribing to Horizon

## Horizon Lapse Grace Period
If Horizon account payment lapses:
- 2 notifications/month for months 1-3 (6 total)
- 2 notifications in final half month
- 1 final notification that account was deleted
- Total grace period: approximately 3.5 months before deletion

## Plan Year System
- Plans counted in years (Year 1, Year 2, Year 3) not calendar dates
- Year 1 begins January 1 of the calendar year following death trigger activation
- Payment timeline and delivery timeline tracked separately
- Storage fees (Horizon) cover gap between signup and activation
- Customers can pay for multiple years upfront
- Calendar in user profiles built around real calendar dates tied to plan years
- Funds for Year 2 not accessed until Year 1 is complete
- Year-by-year fund release automated via server-side cron job
- Service limit: 5 years guaranteed from Horizon signup, unlimited years optional (best effort, no legal guarantee beyond 5)
- Needs further discussion with lawyer before building anything dependent on long-term service obligations

## Calendar System
- Plan Year 1 begins January 1 of the calendar year following death trigger activation
- Intentional grace period: gives bereaved time to process loss before receiving content
- Uses real calendar dates — no relative day counting
- Customers set real dates during setup (anniversaries, birthdays, custom dates)
- Important Dates section in user profiles:
  - Their own birthday
  - Anniversary
  - Partner's birthday
  - Children's birthdays
  - Any custom named dates
- System auto-generates annual delivery schedule every January 1
- Leap years handled automatically by real calendar
- When plan activates, system takes most recent iteration of customer's calendar
- Each calendar entry = Supabase record: plan year, delivery date, content attached, delivery status
- Daily automated check triggers delivery when date matches
- Full automation possible with this model

## Check-in System (Active Plan Users)
- User confirms alive every 6 months via email/app
- Missed check-in triggers 3-month warning period:
  - 2 notifications/month for 3 months (6 total)
  - Notifications sent to BOTH user AND trusted contact
- No response after all 6 notifications: delivery triggered
- This applies to active plan users only (separate from Horizon lapse system)

## Death Trigger System
- Option A: Check-in system failure (see above)
- Option B: Trusted contact confirms passing via portal
- Upon trigger: Year 1 of plan begins January 1 of following calendar year, content delivery schedule activates

## Trusted Contact System
- Optional but strongly encouraged
- Receives all 6 check-in notifications alongside user
- Has portal to confirm death and trigger delivery
- Trusted contact payment authority: TBD, tabled for later discussion
- Trusted contact handling payments after death: potential late add-on

## Social Media Integration
- Platforms: Facebook and Instagram to start, gauge interest and expand later
- Meta Business API required for all scheduled posts
- Backup login credentials REQUIRED (stored securely in Supabase, activated when customer nears end of life)
- Per-customer Posterity-generated passwords stored securely — customer responsible for changing their own passwords
- Buffer as primary scheduling tool, direct login as fallback
- Posterity team logs into customer social media via Buffer post-mortem and posts on their behalf
- Facebook Memories feature: skipped for now, add later if needed (requires direct login)
- Monitor Meta API announcements as standing operational task
- Meta API risks:
  - Meta reduced Instagram limits 96% in 2025 without warning
  - Video: 10 calls/second cap vs 300 for text
  - Instagram caps API posts at 100 per 24-hour rolling window
  - Mitigation: backup direct login, manual override essential

## Video & Content Delivery
- Delivered via social media, text (MMS), and email
- Hard limit: 25MB maximum, 720p minimum quality, 3-4 minutes maximum length
- FFmpeg.wasm compresses automatically client-side at moment of upload within user profile
- System rejects upload with clear error message if file exceeds 25MB after compression
- MMS delivery via Twilio for videos under 25MB
- Secure link fallback via SMS if MMS carrier delivery fails
- Contract and user profile disclaimer: "If direct video delivery is not possible due to carrier limitations, a secure link to your video will be shared instead"
- Email video delivery via link, not attachment (Phase 5)
- Unused video slots can be used as message slots (flexible rollover)
- Remaining messages/videos ticker in user profiles
- Ability to process multiple posts simultaneously (Phase 5)
- Manual override "Post Manually" button for API failures (Phase 5)
- Account passwords required in addition to Meta API access

## Video Storage & Compression
- Storage via Supabase Storage (low cost at early scale)
- Client-side compression via FFmpeg.wasm at point of upload in user profile (Phase 4)
- Upgrade path: Cloudflare Stream or Mux at scale
- Storage limits per tier TBD
- Video weight explanation (2x units) goes in user manual only, not pricing cards

## Customer Contact & Communication (Twilio)
- Posterity phone number via Twilio with voicemail enabled
- Inbound: customer contact for Build Your Own inquiries, general questions, Financial Hardship applications
- Outbound: automated SMS notifications to customers (check-ins, alerts, delivery confirmations)
- MMS: video delivery under 25MB
- Secure link fallback if MMS carrier delivery fails
- No intermediary at launch, founder handles directly
- Posterity email account needed for email video delivery (Phase 5)

## Financial Architecture
- Customer pre-loads full balance upfront
- Funds held in Posterity Trust Account (internal name) / Posterity Legacy Fund (customer-facing name)
- Annual transfers from Trust Account to Posterity Operating Account triggered by server-side cron job at start of each plan year
- Mercury Bank recommended: free business checking, API access, sub-accounts, built for startups
- No employee ever accesses funds directly — fully automated with audit logs
- Any automation failure triggers immediate admin dashboard alert: what failed, which customer, amount, timestamp, retry status
- Full audit trail for every transfer: timestamp, amount, customer ID, plan year
- Formal escrow deferred to Phase 6 — lawyer review required before Phase 5 financial build begins
- Stripe fees: ~2.9% + $0.30 per transaction — not material at early scale

## User Profiles (Phase 4)
- Calendar built around real dates tied to plan years
- Important Dates section (birthday, anniversary, partner/children birthdays, custom dates)
- Social media connection (Meta API + backup credentials — required)
- Video/photo/message upload with FFmpeg compression
- Total cost calculation
- Payment setup (pre-loaded balance)
- Trusted contact info (optional but encouraged)
- Check-in settings
- Remaining messages/videos ticker
- Assurance that money not withdrawn until service starts
- All automated and set up to notify Posterity team

## Onboarding & Walkthrough (Phase 4)
- Step-by-step onboarding walkthrough
- AI chatbot for customer setup guidance and product explanations
- Test/preview mode so customers can see exactly what recipients will receive
- Encourage customers to double-check and test everything before finalizing
- Explain video storage and posting has higher workload (2x unit weight) — in walkthrough/manual only

## Build Your Own & Financial Hardship
- Manual input panel in admin dashboard for custom posting parameters
- Automated system treats them like regular accounts once parameters are set
- How they fit year-by-year automation: needs further discussion before building
- Contact Us buttons on pricing page (no Stripe product needed)

## Admin & Operations (Phase 5)
- Operational dashboard: all tasks in priority order
- Financial dashboard: completely separate from operational
- No employee access to customer funds — audit logs only
- Automated year-by-year fund release via server-side cron job (Mercury Bank)
- Admin dashboard alerts for any automation failures
- Manual input panel for Build Your Own and Financial Hardship accounts
- Manual override Post Manually button for API failures
- Ability to process multiple posts simultaneously
- Twilio voicemail notifications
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
- Refund policy: unspent years refunded ONLY if company closes OR delivery proves unfeasible AND customer met required standards
- Tax compliance (Phase 6)
- Service time limit legal documentation (5yr guaranteed, unlimited optional) — lawyer input needed
- Formal escrow language — lawyer review Phase 6
- Lawyer input required before Phase 5 financial build begins

## Marketing
- Core angle: life chapters not dates
- Hero line: "Your voice. Forever."
- Supporting line: "Your legacy, on your terms"
- January 1 delivery start is a marketing and trust-building point — Posterity is thoughtful about when content is delivered, not just that it is delivered. Content lands when recipients are ready to receive it, not in the immediate fog of grief.
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
- Application/approval process for all users
- Additional social media platforms
- Trusted contact payment authority
- Facebook Memories feature
- Trusted contact handling payments after death

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
| Buffer | Social media scheduling |
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

## Phase Roadmap

### Phase 3 (Current)
- Update Stripe prices to locked pricing ($99/$249/$899) + update Price IDs in code
- Add Limited Availability tag to Legacy plan card
- Legacy customer cap: 10 customers, configurable from admin dashboard
- Connect Stripe to Supabase (record subscription on payment)
- Horizon auto-cancel webhook when plan activates
- Webhook for subscription status changes
- Lock dashboard behind subscription tiers

### Phase 4
- User profiles (real-date calendar tied to plan years, Important Dates section, content scheduling, social media setup)
- Onboarding walkthrough + AI chatbot + test/preview mode
- Check-in system (6 month intervals, 3 month warning, 2x/month notifications)
- Trusted contact system (optional, death confirmation portal)
- Video upload + FFmpeg.wasm compression (client-side at upload)
- Video size/length validation (25MB max, 720p min, 3-4 min max)
- Remaining messages/videos ticker
- Video rollover to messages
- Multi-year cart system with storage fee calculation
- Meta Business API + Buffer integration
- Per-customer backup credentials (required, Posterity-generated passwords)

### Phase 5
- Admin/operational dashboard (priority task list)
- Separate financial dashboard
- Mercury Bank two-account setup (Trust Account + Operating Account)
- Automated year-by-year fund release via server-side cron job
- Admin dashboard alerts for automation failures
- Manual input panel for Build Your Own and Financial Hardship
- Manual override for API failures (Post Manually button)
- Simultaneous post processing
- Twilio voicemail + Posterity email account
- Audit logs for all financial movements
- Test account option
- Lawyer review before financial build begins

### Phase 6
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

## Important Links
- Live site: https://posterity-seven.vercel.app
- GitHub: https://github.com/jerthrwicked/posterity (PRIVATE)
- Vercel dashboard: https://vercel.com/jerthrwicked/posterity
- Stripe dashboard: https://dashboard.stripe.com/test/dashboard
- Supabase dashboard: https://supabase.com/dashboard/project/vypytfmutmeyfwmkapjg
- Pricing analysis PDF: https://drive.google.com/file/d/1nnJhh0fyngr8HbgPDchzJMzb5v-MCqJE/view?usp=sharing

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
