# Posterity - Project Context

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after death. Think of it as a digital time capsule with a subscription model.

## Business Model
- Horizon - $9.99/year (storage only, activate later)
- Basic - $39/year (quarterly billing)
- Premium - $99/year (monthly billing)
- Legacy - $299/year (weekly billing)
- Custom - Coordinated with a rep (prices TBD)
- Financial Hardship - Contact us option

## Project Location
- Local: C:\Users\jerth\posterity
- GitHub: https://github.com/jerthrwicked/posterity
- Live URL: https://posterity-seven.vercel.app

## What's Been Built
- Development environment (Node.js, Git, Cursor)
- Next.js project created
- Homepage, Login, Signup, Dashboard pages
- Working Supabase authentication
- PWA installed on Android
- Live on Vercel
- Pricing page with 4 subscription tiers + Custom and Financial Hardship sections
- Stripe Checkout integration (create-checkout-session API route, price IDs wired up)
- sync-context.js script — copies context MD to OneDrive and regenerates PDF in one command
- npm run sync script added to package.json
- GlobalNav component (app/components/GlobalNav.js) — hamburger dropdown with Pricing, Login, Get Started; closes on outside click
- Global nav added to app/layout.js so it appears on every page automatically
- Homepage cleaned up for mobile: responsive hero text, feature cards match pricing page style (bg-gray-800 border border-gray-700)
- Cursor shell allowlist configured at C:\Users\jerth\.cursor\permissions.json — npm, node, git, npx auto-approved

## Stripe Price IDs
- Horizon: price_1Tcvq1BcdnR2VoDgYustrs4G
- Basic: price_1TeTeyBcdnR2VoDgYhf7uym0
- Premium: price_1Tcvj2BcdnR2VoDgt4oZu8VA
- Legacy: price_1TeTj5BcdnR2VoDgtfA9O3z8

## Supabase Details
- Project URL: https://vypytfmutmeyfwmkapjg.supabase.co
- Auth: Email/password, email confirmation OFF

## What's Next - Phase 4
- Connect Stripe webhooks to Supabase (update user plan on successful payment)
- User dashboard showing current plan and billing status
- Content upload / scheduling UI
- Recipient management (who receives what and when)

## How To Resume
1. Open Cursor
2. cd posterity
3. npm run dev
4. Open http://localhost:3000
5. To sync context docs: npm run sync
