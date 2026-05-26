# Posterity — Project Context

## What Is Posterity
A social media legacy app that allows users to schedule messages, memories, and content to be delivered to loved ones after death. Think of it as a digital time capsule with a subscription model.

---

## Business Model
- **Basic** — Quarterly billing
- **Premium** — Monthly billing
- **Super Premium** — Weekly billing with quarterly special content uploads coordinated with a rep
- **Build Your Own Plan** — Coordinated with a rep (prices TBD)

---

## Tech Stack
| Tool | Purpose |
|---|---|
| Next.js 16.2.6 | App framework (web + mobile friendly) |
| Tailwind CSS | Styling |
| Supabase | Database + Auth |
| Stripe | Payments + Subscriptions |
| Vercel | Hosting + Deployment |
| GitHub | Code storage |
| Cursor | Code editor (AI-assisted) |

---

## Key Features (Planned)
1. User authentication (signup, login, account management)
2. Subscription tiers with Stripe billing
3. Content creation (messages, videos, letters)
4. Death trigger system:
   - **Option A:** Periodic check-in (user confirms they're alive)
   - **Option B:** Trusted contact confirms passing
5. Scheduled content delivery to beneficiaries

---

## Project Location
- **Local:** `C:\Users\jerth\posterity`
- **GitHub:** https://github.com/jerthrwicked/posterity
- **Live URL:** https://posterity-seven.vercel.app

---

## File Structure
```
posterity/
├── app/
│   ├── page.js         ✅ Homepage (built)
│   ├── layout.js       ✅ Root layout
│   └── globals.css     ✅ Global styles
├── public/             Static assets
├── CONTEXT.md          This file
├── next.config.mjs
├── package.json
└── tailwind.config.js
```

---

## What's Been Built
- [x] Development environment (Node.js, Git, Cursor)
- [x] Next.js project created
- [x] Posterity homepage with black design, hero section, 3 feature cards
- [x] Code pushed to GitHub
- [x] App deployed live on Vercel

---

## What's Next (Phase 2)
- [ ] Login page (`app/login/page.js`)
- [ ] Signup page (`app/signup/page.js`)
- [ ] Supabase project setup + connection
- [ ] User authentication flow
- [ ] Dashboard page for logged-in users
- [ ] Pricing page with all 4 tiers

---

## How To Resume Development
1. Open Cursor
2. Open terminal (Terminal → New Terminal)
3. Type: `cd posterity` and press Enter
4. Type: `npm run dev` and press Enter
5. Open browser to `http://localhost:3000`
6. Paste this file into Claude chat to restore full context

---

## Developer Notes
- Windows 11 machine
- Terminal works best in PowerShell (not Command Prompt)
- Node.js v24.16.0 installed
- Git v2.54.0 installed
- Owner: jerthrwicked (GitHub username)
- Non-technical founder — all code written by AI
