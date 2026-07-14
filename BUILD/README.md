# BUILD/ — Walker's working documents

Everything in this folder was written by **Walker + Claude (OptiServer)**. Everything *outside*
this folder — `Project Documents/`, `CONTEXT_for_posterity.md`, the PDFs — is **Jeremy's** and is
not edited by us.

## Git rules for this checkout

- **`main` matches Jeremy's `origin/main` exactly. It is never committed to.**
- All of our work lives on the **`walker/build`** branch.
- **Pushing to Jeremy's repo is disabled at the git level.** The push URL is set to
  `NO_PUSH_JEREMYS_REPO`, so any `git push` fails loudly instead of quietly modifying his repo.
  To undo (only with Jeremy's agreement):
  `git remote set-url --push origin git@github.com:jerthrwicked/posterity.git`
- If we ever want our work on GitHub, it goes to **a separate repo under Walker's account**, added
  as a second remote. Jeremy's stays untouched either way.

## The documents

| File | What it is |
|---|---|
| `CHANGELOG.md` | **Everything we've changed.** Since we never push to Jeremy's repo, this is the only record he gets — keep it current, and keep database changes visibly separate from code changes. |
| `CODE_AUDIT.md` | What is *actually built*, verified by reading every line. Read this before believing any roadmap. |
| `BUILD_ORDER.md` | What to build, in order, grounded in the audit. Does not replace Jeremy's roadmap. |
| `POSTERITY_SOCIAL.md` | The Posterity Social spec (Jeremy's, 2026-07-13) plus the open questions and risks it raises. |

## The one thing to carry into every session

**The documents are far ahead of the code.** Posterity has a 108KB context document, a
collaboration system, a PDF pipeline, and a Priority System with a mathematical foundation — and
as of 2026-07-13 the entire application was 1,040 lines, could not sign up a user, and had an
empty database. Do not let the volume of planning imply the product exists. Check the code. Check
the database.
