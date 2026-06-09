# Priority Zero: The Claude ↔ Cursor Bridge
## Complete Build Documentation
### Posterity Project | June 2026

---

## What This Is

This document explains the Priority Zero build: the bidirectional bridge between Claude and Cursor Agent.

Priority Zero solved the hardest foundational workflow problem in the Posterity project. Claude and Cursor are powerful in different ways, but they normally operate in separate environments. Claude is where planning, product reasoning, project memory, and strategic decisions happen. Cursor Agent is where files are edited, terminal commands run, tests execute, and code gets committed. Before this bridge, there was no native way for Claude to send work directly into Cursor or receive a result back.

That meant Jeremy had to manually copy prompts from Claude, paste them into Cursor, wait for Cursor to finish, then carry the result back to Claude. This worked, but it was slow, fragile, and not scalable. Every manual handoff was a place where context could be lost.

The bridge unlocks a cleaner workflow: Claude can prepare a task, send it into the local Posterity project, Cursor can pick it up, execute it, and return a result. Jeremy still approves important actions, but he no longer has to be the messenger between two tools.

---

## Why This Matters (Context Section)

An MCP server is a small connector that gives an AI tool access to specific actions. In plain English, it is like giving Cursor a custom set of project-specific buttons. Instead of only asking general questions, Cursor can call tools that know how Posterity works. In this project, the MCP server is the custom bridge that lets Cursor ask Claude questions, read incoming tasks, and write results back out.

A one-way connection was useful, but not enough. The first working tool, `ask_posterity`, let Cursor ask Claude questions and get answers based on the full context document. That solved one side of the problem: Cursor could ask for help. But Claude still could not start work by sending a task to Cursor. A true bidirectional loop means both sides can participate: Claude can send tasks in, and Cursor can send results back.

This pattern is powerful for a non-technical founder because it separates thinking from execution without requiring the founder to translate between them. Claude can help plan and clarify the work. Cursor can edit files and run commands. The founder can stay focused on product direction, approvals, taste, and priorities.

For Posterity, this matters because the project is large, emotionally detailed, and rule-heavy. The context document is the source of truth. The bridge makes it possible for future build sessions to follow that source of truth while reducing manual copy-paste work. It is the foundation for a more automated build workflow.

---

## The Problem

The starting state was simple but limiting:

- Claude.ai and Cursor Agent were separate environments.
- There was no native communication channel between them.
- Jeremy was manually copy-pasting every prompt from Claude to Cursor.
- Cursor could execute code, but it did not automatically know what Claude had planned.
- Claude could reason through the product, but it could not directly place work into Cursor.
- This slowed the project down and made every workflow dependent on manual handoff.

This was especially painful for Posterity because the project depends on careful wording, locked rules, pricing decisions, phase language, design standards, and long-term architecture. A manual handoff could easily miss a detail.

---

## The Solution Architecture

The solution is a local bridge made from four parts:

1. The MCP server at `posterity-mcp/index.mjs`
2. Three MCP tools: `ask_posterity`, `receive_task`, and `post_result`
3. Two bridge files: `cursor-inbox.md` and `cursor-outbox.md`
4. A local-only API route: `app/api/cursor-inbox/route.js`

The MCP server is the connector. It runs locally and exposes project-specific tools to Cursor. It was renamed to `claude-cursor-bridge` so its purpose is clear.

The three tools each have a specific role:

- `ask_posterity` lets Cursor ask Claude a question using the full Posterity context document.
- `receive_task` lets Cursor read a task from `cursor-inbox.md`.
- `post_result` lets Cursor write a result to `cursor-outbox.md`.

The bridge files are simple local handoff files:

- `cursor-inbox.md` is where incoming tasks are written for Cursor to read.
- `cursor-outbox.md` is where Cursor writes results for Claude to read.

The local API route gives Claude in Chrome a way to write tasks into the inbox. Claude in Chrome can call `http://localhost:3000/api/cursor-inbox` while the local dev server is running. That route accepts a JSON body with a `task` field and writes it to `cursor-inbox.md`.

The full task flow:

```text
Claude plans task
  ↓
Claude in Chrome POSTs task to localhost API route
  ↓
app/api/cursor-inbox/route.js writes task to cursor-inbox.md
  ↓
Cursor Agent calls receive_task through claude-cursor-bridge
  ↓
receive_task returns task and clears cursor-inbox.md
  ↓
Cursor Agent executes the task
  ↓
Cursor Agent calls post_result with the result
  ↓
post_result writes result to cursor-outbox.md
  ↓
Claude reads result and continues planning
```

That is the bidirectional loop.

---

## Step-by-Step Build Log

### Step 1: ask_posterity (One-Way — Claude answers Cursor)

The first tool built was `ask_posterity`. It lives in `posterity-mcp/index.mjs`.

This tool reads `CONTEXT_for_posterity.md`, sends the user's question plus the full context to the Anthropic API, and returns Claude's answer to Cursor. It gives Cursor access to project decisions, rules, account phases, pricing, copy constraints, architecture notes, and current build status.

This enabled Cursor to ask questions like whether the Legacy tier is priced at `$899/year` and receive the correct answer from the full context.

Status: ✅ Complete

### Step 2: receive_task + post_result (Infrastructure)

Two new MCP tools were added to `posterity-mcp/index.mjs`.

`receive_task` reads from `cursor-inbox.md` in the project root. If the file exists and contains content, it returns that content as the next task and clears the file so the same task is not returned twice. If the file is empty or missing, it returns `NO_TASK`.

`post_result` accepts a `result` string, writes it to `cursor-outbox.md`, overwrites any previous content, and returns confirmation.

The bridge files were created:

- `cursor-inbox.md`
- `cursor-outbox.md`

Both files were added to `.gitignore` because they are local working files. They may contain temporary task instructions or results and should not be committed.

Status: ✅ Complete

### Step 3: Local API Route (Claude → Cursor write path)

The local route `app/api/cursor-inbox/route.js` was created.

It accepts `POST` requests with a JSON body containing a `task` field. When a valid task is provided, it writes the task to `cursor-inbox.md` and returns:

```json
{ "success": true, "message": "Task written to cursor-inbox.md" }
```

If no task is provided, it returns:

```json
{ "success": false, "message": "No task provided" }
```

with status `400`.

The route is local-only. It checks loopback/local request values and rejects non-local origins with status `403`.

The file begins with:

```js
// LOCAL ONLY — never deploy this route
```

That comment matters because this route writes directly into a local project file. It is a development bridge only. It must never be deployed to Vercel or exposed publicly.

Status: ✅ Complete

### Step 4: Claude in Chrome Integration (Live verification)

Claude in Chrome was used as the browser-side mechanism to reach the local route. With the Next.js dev server running, Claude in Chrome can send a fetch request to `localhost:3000`.

The bridge was verified with a POST request that wrote a test task into `cursor-inbox.md`.

Successful response:

```json
{"success":true,"message":"Task written to cursor-inbox.md"}
```

Cursor then called `receive_task`, received the queued task, and confirmed that all three bridge tools were visible under `claude-cursor-bridge`: `ask_posterity`, `receive_task`, and `post_result`.

Status: ✅ Complete

---

## Files Created or Modified

`posterity-mcp/index.mjs`

Defines the local MCP server. It now exposes `ask_posterity`, `receive_task`, and `post_result`. The server was renamed to `claude-cursor-bridge`.

`.cursor/mcp.json`

Local Cursor MCP configuration. The server key was renamed from `posterity` to `claude-cursor-bridge`. This file is ignored because it contains credentials.

`cursor-inbox.md`

Local inbox file for tasks sent from Claude to Cursor. Ignored by git.

`cursor-outbox.md`

Local outbox file for Cursor results sent back to Claude. Ignored by git.

`.gitignore`

Updated to ignore `cursor-inbox.md` and `cursor-outbox.md`.

`app/api/cursor-inbox/route.js`

Local-only API route that accepts a task and writes it to `cursor-inbox.md`. It rejects non-local origins and must never be deployed.

`Project Documents/Priority_Zero_Bridge_Documentation.md`

This documentation file.

---

## Security Notes

- The local API route must never be deployed to Vercel.
- `app/api/cursor-inbox/route.js` starts with `LOCAL ONLY — never deploy this route`.
- The route only permits localhost/loopback requests.
- External origins are rejected with `403`.
- `cursor-inbox.md` and `cursor-outbox.md` are in `.gitignore`.
- The MCP config remains ignored because it contains secrets.
- The bridge is a local development workflow tool, not a production feature.

---

## What This Unlocks

The Priority Zero bridge makes it possible for Claude to push tasks toward Cursor without Jeremy manually copying every prompt.

It establishes the foundation for future automation of the Posterity build process. Claude can plan and structure work. Cursor can pick up tasks, edit files, run commands, and report results. Jeremy remains the decision-maker, but no longer has to carry every instruction between systems by hand.

This is also a reusable pattern. Any project that uses Claude for planning and Cursor for implementation can use the same basic model:

- a local MCP server,
- an inbox file,
- an outbox file,
- a local-only API route,
- and a clear approval workflow.

For Posterity, this means the project can keep growing without the workflow becoming heavier every time the context gets larger. The bridge is the first real step toward a founder-led, AI-assisted build system that can move faster while staying aligned with the product vision.
