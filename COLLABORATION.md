# Posterity — Shared Claude Code Session Conventions

This file defines how **two people share one Claude Code conversation** while building Posterity.
Claude reads this file, so these are standing rules — not just notes for us.

---

## Who's here
- **Walker** — collaborator
- **Grego** (Jeremy Grego) — main builder

---

## The rules

### 1. Attribution — always prefix
Start every message with your name in brackets so Claude (and the transcript) knows who's talking:
- `[Walker] ...`
- `[Grego] ...`

### 2. One driver at a time
Don't both send messages while Claude is mid-task. Whoever is actively working "holds the stick."
Hand off explicitly: `[Walker] your turn`.

### 3. Announce context switches
When you jump to a different workstream, say so:
`[Grego] switching to the Priority System weight table now`.
This tells Claude to reset rather than blend the two threads.

### 4. Hold / Back-in — let us talk privately
When we want to talk between ourselves without Claude jumping in:

- **To pause Claude:** say `Claude, give us a moment` (or `hold`).
  → Claude acknowledges once, then stays minimal. It will **not** weigh in, plan, edit, or run tools.
  It only reads and waits. Any messages sent during a hold get a bare acknowledgment (or nothing), never a full response.

- **To resume Claude:** say `Claude, back in`.
  → Claude re-engages fully and picks up where we left off.

> Note on how this actually works: Claude is turn-based — every message you send still triggers *a* reply.
> "Hold" means those replies stay out of the way until `back in`. For a truly silent side-conversation,
> just talk off-channel (out loud / Slack) and only type here when you have something for Claude.

### 5. Decisions live in files, not chat
The conversation is a working surface, not memory. When we settle something, Claude writes it to the
right context doc so it survives summarization, resets, or the other person's next session.

**Source-of-truth docs:**
- `CONTEXT_for_posterity.md` — master project context
- `Project Documents/Posterity_Build_Roadmap.md` — build stages & prerequisites
- `Project Documents/Posterity_Build_Log.md` — what's been built
- `Project Documents/Priority_Zero_Bridge_Documentation.md` — Priority System foundation

### 6. Shared access — know what's in the room
This session has authorized reach into **Supabase, Gmail, and Google Drive** (MCP). Whoever is at the
keyboard inherits all of it. Don't run destructive or outward-facing actions without the other's OK.
