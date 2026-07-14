# Posterity — Meta Delivery: what Jeremy built, and the one thing it doesn't cover · Walker Brown
**Walker's notes · 2026-07-13 · read against `Project Documents/Posterity Project Context.md`,
"Social Media Integration" (lines 256–272) and the Technical Risks register (line 710).**

Meta stays. Facebook and Instagram are the delivery platforms, published via Buffer. This note is
not an argument against that. It is the one thing his design doesn't account for, and what it would
cost to cover.

---

## What he built — and it is a real answer

Four layers deep:

1. **Buffer** — the automated path, used by the Posterity team post-activation.
2. **Meta Business API** — required for all scheduled posts.
3. **Direct platform login** — a Posterity-generated password per customer, stored in Supabase, with
   **2FA pointed at a Posterity-controlled backup email or Twilio number**, explicitly so access
   survives after the customer is gone.
4. **Manual override** — a "Post Manually" button; staff publish by hand, logged with timestamp,
   staff member, task ID, and reason.

Plus a standing task to monitor Meta API announcements, and operational alerts for *"backup
credentials missing or expired"* and *"2FA recovery attempt detected."*

## It answers the objection I raised, and I was wrong to say otherwise

I argued that a **~60-day Meta access token against a 30-year promise** was an architectural killer:
~160 re-authorizations over a long account, each requiring a login to a customer's Facebook,
including after they die.

**His design answers that.** If staff can log in directly — stored password, Posterity-controlled
2FA — they can re-authorize Buffer indefinitely. It is labor-heavy and it carries a serious
credential risk, but it *works*. His register's verdict on Meta API instability — *"this is now an
inconvenience, not a risk"* — **is correct for the risk he named.**

---

## 🔴 The gap: every layer depends on being able to log in

Buffer needs an authorized connection. Direct login needs a login. Manual override needs a login.
**The entire four-layer chain is one dependency deep.**

There is exactly one event that removes that dependency permanently, for all four layers at once:

### Memorialization

**The word "memorial" does not appear anywhere in the project documents.** (Grepped, 2026-07-13.)

- A **memorialized Facebook account cannot be logged into by anyone** — not with the password, not
  with the 2FA code, not by Meta support. **The stored credentials become inert.** Every fallback
  dies at the same instant.
- **Any person can trigger it** by reporting the death, typically with nothing more than a link to an
  obituary. Meta also memorializes proactively when it detects a death.
- **Legacy Contact does not rescue it.** A legacy contact can pin a post and change the profile
  photo. They **cannot post as the person.**

### And the product is what triggers it

This is the part that makes it more than a footnote.

The people most likely to report a death to Facebook are **close family**. Those are exactly the
recipients Posterity delivers to. And the deliveries themselves — a man's posts appearing on his wall
months after his funeral — are the single most likely thing to prompt someone to report the account,
or to ask Facebook what is going on with it.

**The more emotionally effective the product is, the more likely someone memorializes the account and
ends it.** Success and failure share a trigger.

### A second, smaller one: account-takeover defenses

Repeated logins to long-dormant accounts, from one office IP, across hundreds of accounts, is a
textbook ATO signal. The checkpoint Meta throws is **sometimes** a 2FA code — which Posterity
controls — but is often **photo ID of the account holder**, which a dead person cannot supply.

He half-saw this: there's already an alert for *"2FA recovery attempt detected."* But a code-based
challenge is recoverable and an ID-based one is not.

---

## What to do — and he has already half-agreed to it

His own document says:

> *"Failure to provide credentials is a breach of user agreement but **will not cancel service**."*

**He has already accepted that the social channel can be unavailable and the product must still
deliver.** Memorialization is simply another way that happens — an involuntary one. So this is not a
new principle, it's the existing one applied to a case he hasn't listed.

1. **Every content item carries a recipient email or phone, always.** So a dead social channel falls
   back automatically instead of failing. **This is a schema decision and it is cheap right now** —
   it gets expensive once there's content in the database.
2. **Detect memorialization; treat it as terminal for that channel.** A memorialized profile is
   publicly marked *"Remembering"* — it is detectable. One more row on the ops dashboard he's already
   designing, alongside "credential issue" and "post execution failed."
3. **One line in the customer contract:** *"If a platform becomes unavailable, your message is
   delivered by email or text instead."* Cheap to write today. Impossible to retrofit after the first
   family calls to ask why their father's message never arrived.

---

## The verdict

**Not "drop Meta."** Meta will often work, it's what customers expect, and his fallback chain is
genuinely well-thought-through against the risk he identified.

**But Meta cannot be the channel Posterity *guarantees*** — because the one failure it cannot absorb
is triggered by the very people the product is for, and neither Posterity nor the customer controls
it.

**Email/SMS is the spine. Meta is the bonus channel on top.** That is the only reason the build order
does delivery **email-first** — not because social is unimportant, but because a promise that a
grieving cousin can revoke cannot be the foundation under one.

---

## Also worth flagging: the credential store

The design stores **every customer's Facebook/Instagram password in Supabase**, with their **2FA
recovery pointed at Posterity-controlled contacts**. If that table is breached, the attacker gets
working credentials *and* the recovery channel for hundreds of real people's accounts — living and
dead. If it's built, it needs envelope encryption, separate key custody, and strict access logging.
It should be the most protected data in the company, not a column in a table.

---

## Bonus — this one is good news

> *"Pricing locked at $99 / $249 / $899 for the Stage 3 Stripe build; any re-pricing post-review is a
> **Stripe Price ID swap, not a code rebuild**."* — his context doc

That is exactly what `lib/plans.js` (the single source of truth, plus a server-side plan→price map)
is designed to give him. The Stripe work already queued in `BUILD_ORDER.md` is the thing he asked
for — and it confirms **$99 / $249 / $899** are the intended numbers, which is what the live site
displays and **not** what Stripe currently charges. See `CODE_AUDIT.md`, Finding 2.
