# Posterity — Build Log
Last updated: June 13, 2026

This document is a record of everything built for the Posterity project, organized by category. It is updated at the end of every session by Claude Code, based on instructions authored by Claude.ai. Completed items move here from Posterity_Build_Roadmap.md when finished.

---

## Development Environment
| Item | Date Completed |
|------|---------------|
| Windows 11 development environment configured | May 25, 2026 |
| Node.js v24.16.0 installed | May 25, 2026 |
| Git installed and configured | May 25, 2026 |
| Cursor installed and configured as primary IDE | May 25, 2026 |
| Cursor Pro+ subscription active — Sonnet 4.6 Max enabled, Medium throttling resolved | June 4, 2026 |
| Privacy mode disabled in Cursor, usage-based spending enabled | June 4, 2026 |

---

## Project Foundation
| Item | Date Completed |
|------|---------------|
| Next.js project initialized | May 25, 2026 |
| GitHub repository created (private) — jerthrwicked/posterity | May 25, 2026 |
| Vercel hosting configured, project live at posterity-seven.vercel.app | May 27, 2026 |
| .cursorrules file created in project root with full project context | June 7, 2026 |
| Project Documents folder created in project root | May 31, 2026 |

---

## Core Pages Built
| Item | Date Completed |
|------|---------------|
| Homepage | May 26, 2026 |
| Login page | May 28, 2026 |
| Signup page | May 28, 2026 |
| Dashboard page | May 30, 2026 |
| Pricing page (all 6 tiers) | June 1, 2026 |
| Global nav in layout.js — dropdown, all pages | May 29, 2026 |

---

## Authentication
| Item | Date Completed |
|------|---------------|
| Supabase authentication — email and password, email confirmation disabled | May 30, 2026 |
| PWA installed on Android | June 2, 2026 |

---

## Homepage Visual Updates
| Item | Date Completed |
|------|---------------|
| Hero sublines replaced with approved copy | June 8, 2026 |
| Feature card copy updated: A Living Legacy, On Your Terms, Fully Automated. Fully Protected | June 8, 2026 |
| Nav item Pricing renamed to Plans | June 8, 2026 |
| Login renamed to Account with state-dependent logic | June 8, 2026 |
| Hamburger dropdown updated with logged in and logged out states | June 9, 2026 |
| Hero buttons removed | June 9, 2026 |
| Homepage cards updated to match pricing cards | June 10, 2026 |

---

## Plans Page Visual Updates
| Item | Date Completed |
|------|---------------|
| Locked pricing applied: Basic $99, Premium $249, Legacy $899 | June 5, 2026 |
| All plan bullets updated to per plan year language | June 5, 2026 |
| Horizon description updated | June 5, 2026 |
| Financial Hardship tier renamed to Posterity Grace | June 6, 2026 |
| Limited Availability badge added to Legacy card | June 6, 2026 |
| Button uniformity applied across all cards | June 6, 2026 |
| Card sizing and spacing updated | June 7, 2026 |

---

## Stripe Integration (Partial — Stage 3 in progress)
| Item | Date Completed |
|------|---------------|
| Stripe sandbox account created | June 1, 2026 |
| Four Stripe products created: Horizon, Basic, Premium, Legacy | June 1, 2026 |
| Stripe checkout working and tested for all tiers | June 3, 2026 |
| Stripe MCP added to mcp.json | June 7, 2026 |

---

## MCP Servers
| Item | Date Completed |
|------|---------------|
| GitHub MCP configured — 26 tools, personal access token, no expiration | May 27, 2026 |
| Supabase MCP configured — 29 tools, personal access token | May 27, 2026 |
| Filesystem MCP added to mcp.json | June 7, 2026 |
| Stripe MCP added to mcp.json | June 7, 2026 |
| Google Docs MCP connected — context doc and session log doc live | June 9, 2026 |
| posterity-mcp server built — ask_posterity tool tested and confirmed working | June 11, 2026 |
| MCP server renamed from posterity to claude-cursor-bridge in index.mjs and mcp.json | June 12, 2026 |

---

## Claude ↔ Cursor Bridge (Priority Zero — Complete)
| Item | Date Completed |
|------|---------------|
| ask_posterity tool built and verified — Cursor Agent can call Claude via MCP with full project context | June 11, 2026 |
| receive_task and post_result tools built and verified | June 12, 2026 |
| Local API route app/api/cursor-inbox/route.js built and verified (localhost only, never deploy) | June 12, 2026 |
| Claude in Chrome bridge test verified — success response confirmed | June 12, 2026 |
| Bridge files cursor-inbox.md and cursor-outbox.md created in project root, added to .gitignore | June 12, 2026 |
| Priority Zero bridge documentation markdown created at Project Documents/Priority_Zero_Bridge_Documentation.md | June 13, 2026 |

---

## PDF Pipeline
| Item | Date Completed |
|------|---------------|
| PDF pipeline built using Puppeteer and markdown-it, replacing wkhtmltopdf and md-to-pdf | June 3, 2026 |
| scripts/generate-pdf.js — plain context PDF, called automatically by npm run sync | June 3, 2026 |
| scripts/generate-stylized-pdf.js — styled investor PDF, manual only via npm run generate-stylized | June 4, 2026 |
| Both commands added to package.json: generate-pdf and generate-stylized | June 4, 2026 |
| sync-context.js confirmed: calls generate-pdf.js only, never touches stylized PDF | June 4, 2026 |
| Plain PDF output confirmed at 0.65MB | June 4, 2026 |
| Stylized PDF design spec locked — cover, typography, clearance rules, page numbers, sage and dusk rebrand | June 10, 2026 |
| Stylized PDF partial corrections complete — POSTERITY small caps top-left, blue rule on cover, hero corrected to 52px | June 13, 2026 |

---

## Context Management
| Item | Date Completed |
|------|---------------|
| sync-context.js created with npm run sync command | May 31, 2026 |
| npm run sync appends session-notes.md to Google Session Log, updates Google Context Doc, resets session-notes.md template | June 9, 2026 |
| Anthropic Console account active — API credits for MCP bridge, auto-reload enabled | June 11, 2026 |
| Claude in Chrome extension installed, connected, permissions set on all key sites | June 8, 2026 |
| cursor.com/dashboard accessible via Claude in Chrome | June 8, 2026 |
| platform.claude.com accessible via Claude in Chrome | June 8, 2026 |

---

## Rules and Operating Procedures
| Item | Date Completed |
|------|---------------|
| Rules 1 through 25 established and documented in context | May 25 — June 2, 2026 |
| Rules 26 through 33 established and documented in context | June 3 — June 13, 2026 |
| Rule 31 added — first Claude Code prompt each session must check if npm run dev is running | June 13, 2026 |
| Session workflow documented | May 26, 2026 |
| Operating procedures documented — PDF pipeline, session start, session end, approval gate, branches | May 28, 2026 |
