# Posterity — Build Log

Link: [Posterity Build Roadmap](https://docs.google.com/document/d/1mjcZUXLESWFxI6pwSvW5U82AA6bmhKhyB2DDkzq-bWo/edit?usp=sharing)

This file is the record of everything built for Posterity. Claude Code writes an entry here when a task closes out and removes it from Posterity_Build_Roadmap.md in the same pass, so neither file is updated without the other. Nothing is ever removed from this log.

Entries are organized by category, with the newest first within each. A category groups work by what it belongs to rather than by when it happened, so a single category can span months.

Entries predating September 12, 2026 were written under stage numbering that has since been retired. A stage number appearing within an older entry does not correspond to the current roadmap.

---

## Claude Code Transition

| Item | Date Completed |
| :-- | :-- |
| Claude Code installed and authenticated on the Claude Max subscription, verified through /status rather than API credits | July 22, 2026 |
| CLAUDE.md authored and written to the project root | July 22, 2026 |
| settings.json configured — Plan Mode and Sonnet default, Opus available through /model | July 22, 2026 |

---

## Claude to Cursor Bridge

The bridge is retired. Claude Code replaced it, and these entries stand as history rather than as a description of anything currently running.

| Item | Date Completed |
| :-- | :-- |
| Priority Zero bridge documentation markdown created at Project Documents/Priority_Zero_Bridge_Documentation.md | June 13, 2026 |
| Bridge files cursor-inbox.md and cursor-outbox.md created in project root, added to .gitignore | June 12, 2026 |
| receive_task and post_result tools built and verified | June 12, 2026 |
| Local API route app/api/cursor-inbox/route.js built and verified, localhost only and never deployed | June 12, 2026 |
| Claude in Chrome bridge test verified — success response confirmed | June 12, 2026 |
| ask_posterity tool built and verified — Cursor Agent can call Claude through MCP with full project context | June 11, 2026 |

---

## MCP Servers

| Item | Date Completed |
| :-- | :-- |
| MCP server renamed from posterity to claude-cursor-bridge within index.mjs and mcp.json | June 12, 2026 |
| posterity-mcp server built — ask_posterity tool tested and confirmed working | June 11, 2026 |
| Google Docs MCP connected — context doc and session log doc live | June 9, 2026 |
| Filesystem MCP added to mcp.json | June 7, 2026 |
| Stripe MCP added to mcp.json | June 7, 2026 |
| GitHub MCP configured — 26 tools, personal access token, no expiration | May 27, 2026 |
| Supabase MCP configured — 29 tools, personal access token | May 27, 2026 |

---

## PDF Pipeline

| Item | Date Completed |
| :-- | :-- |
| Stylized PDF partial corrections complete — POSTERITY small caps top left, blue rule on cover, hero corrected to 52px | June 13, 2026 |
| Stylized PDF design spec locked — cover, typography, clearance rules, page numbers, sage and dusk rebrand | June 10, 2026 |
| Both commands added to package.json: generate-pdf and generate-stylized | June 4, 2026 |
| scripts/generate-stylized-pdf.js — styled investor PDF, manual only through npm run generate-stylized | June 4, 2026 |
| sync-context.js confirmed: calls generate-pdf.js only, never touches the stylized PDF | June 4, 2026 |
| Plain PDF output confirmed at 0.65MB | June 4, 2026 |
| PDF pipeline built using Puppeteer and markdown-it, replacing wkhtmltopdf and md-to-pdf | June 3, 2026 |
| scripts/generate-pdf.js — plain context PDF, called automatically by npm run sync | June 3, 2026 |

---

## Context Management

| Item | Date Completed |
| :-- | :-- |
| Anthropic Console account active — API credits for the MCP bridge, auto-reload enabled | June 11, 2026 |
| npm run sync appends session-notes.md to the Google Session Log, updates the Google Context Doc, and resets the session-notes.md template | June 9, 2026 |
| Claude in Chrome extension installed, connected, permissions set on all key sites | June 8, 2026 |
| cursor.com/dashboard accessible through Claude in Chrome | June 8, 2026 |
| platform.claude.com accessible through Claude in Chrome | June 8, 2026 |
| sync-context.js created with the npm run sync command | May 31, 2026 |

---

## Stripe Integration

| Item | Date Completed |
| :-- | :-- |
| Stripe MCP added to mcp.json | June 7, 2026 |
| Stripe checkout working and tested for all tiers | June 3, 2026 |
| Stripe sandbox account created | June 1, 2026 |
| Four Stripe products created: Horizon, Basic, Premium, Legacy | June 1, 2026 |

---

## Plans Page Visual Updates

| Item | Date Completed |
| :-- | :-- |
| Card sizing and spacing updated | June 7, 2026 |
| Financial Hardship tier renamed to Posterity Grace | June 6, 2026 |
| Limited Availability badge added to the Legacy card | June 6, 2026 |
| Button uniformity applied across all cards | June 6, 2026 |
| June ladder applied, since superseded: Basic $99, Premium $249, Legacy $899. Later ladder changes may not have been logged | June 5, 2026 |
| All plan bullets updated to per plan year language | June 5, 2026 |
| Horizon description updated | June 5, 2026 |

---

## Homepage Visual Updates

| Item | Date Completed |
| :-- | :-- |
| Homepage cards updated to match the pricing cards | June 10, 2026 |
| Hamburger dropdown updated with logged in and logged out states | June 9, 2026 |
| Hero buttons removed | June 9, 2026 |
| Hero sublines replaced with approved copy | June 8, 2026 |
| Feature card copy updated: A Living Legacy, On Your Terms, Fully Automated, Fully Protected | June 8, 2026 |
| Nav item Pricing renamed to Plans | June 8, 2026 |
| Login renamed to Account with state-dependent logic | June 8, 2026 |

---

## Authentication

| Item | Date Completed |
| :-- | :-- |
| PWA installed on Android | June 2, 2026 |
| Supabase authentication — email and password, email confirmation disabled | May 30, 2026 |

---

## Core Pages Built

| Item | Date Completed |
| :-- | :-- |
| Pricing page, all six tiers | June 1, 2026 |
| Dashboard page | May 30, 2026 |
| Global nav within layout.js — dropdown, all pages | May 29, 2026 |
| Login page | May 28, 2026 |
| Signup page | May 28, 2026 |
| Homepage | May 26, 2026 |

---

## Project Foundation

| Item | Date Completed |
| :-- | :-- |
| .cursorrules file created within the project root with full project context | June 7, 2026 |
| Project Documents folder created within the project root | May 31, 2026 |
| Vercel hosting configured, project live at posterity-seven.vercel.app | May 27, 2026 |
| Next.js project initialized | May 25, 2026 |
| GitHub repository created, private — jerthrwicked/posterity | May 25, 2026 |

---

## Development Environment

| Item | Date Completed |
| :-- | :-- |
| Cursor Pro+ subscription active — Sonnet 4.6 Max enabled, Medium throttling resolved | June 4, 2026 |
| Privacy mode disabled within Cursor, usage-based spending enabled | June 4, 2026 |
| Windows 11 development environment configured | May 25, 2026 |
| Node.js v24.16.0 installed | May 25, 2026 |
| Git installed and configured | May 25, 2026 |
| Cursor installed and configured as the primary IDE | May 25, 2026 |

---

## Rules and Operating Procedures

| Item | Date Completed |
| :-- | :-- |
| Rule 31 added — the first Claude Code prompt each session checks whether npm run dev is running | June 13, 2026 |
| Rules 26 through 33 established and documented within the context | June 3 to June 13, 2026 |
| Rules 1 through 25 established and documented within the context | May 25 to June 2, 2026 |
| Operating procedures documented — PDF pipeline, session start, session end, approval gate, branches | May 28, 2026 |
| Session workflow documented | May 26, 2026 |
