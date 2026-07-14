# Posterity Social
**Spec received 2026-07-13 (Jeremy's, via Walker). Open questions and risks appended by Claude (OptiServer).**

> ✅ **CORRECTED 2026-07-13 — Posterity Social is ADDITIVE. It does not replace Meta.**
>
> An earlier version of this file said the Meta/Instagram integration was dead. **That was wrong.**
> Claude inferred it from a secondhand summary and wrote it down as settled fact, even though it
> contradicted Jeremy's own context document. It should have been raised as a question, not recorded
> as a decision. Jeremy has confirmed:
>
> - **Facebook and Instagram remain the delivery platforms** ("Insta and Facebook only as of now").
> - **Buffer is the intended publishing route**, to avoid building against the Meta API directly.
>   Direct API is "gonna be an option" later.
> - **Posterity Social is a second, additional layer** — the living-phase experience — not a
>   substitute for delivery.
>
> The context document's "Social Media Integration" section therefore **stands**. The risks in it are
> real and are documented below under *Meta delivery — the risks that Buffer does not remove*. They
> are Jeremy's call to accept; our job is to make sure he's accepting them knowingly.

---

## THE SPEC (Jeremy's — not edited)

Posterity Social is a built-in social media network that lives inside Posterity. It is not a
separate product bolted onto the legacy app — it is another layer of the same build, sharing the
same accounts, the same walled boundary, and the same underlying systems. Where the core product is
what happens for a customer's loved ones after the customer is gone, Posterity Social is what the
living phases actually feel like day to day: a place to build a legacy alongside other people, to
cope, to connect, and to be part of something.

Access is **unlocked by the Horizon storage fee** — one of the three purposes that fee serves. The
network is expected to become a primary reason people join, stay, and continue paying: not an
add-on to the storage product, but a central pillar of what Posterity is.

**The founding vision.** Social media today belongs to the young. Posterity Social inverts that. It
is a walled space that belongs to the elderly and to those facing mortality — something that is
theirs, that the young are not part of and cannot see. Because nothing can be shared outside the
system, what happens inside stays inside. Over time that exclusivity is intended to become part of
the draw: a space people hear about and want into, precisely because it cannot be viewed from the
outside. It is meant to create pride, ownership, and belonging, and to help people cope with
disease, aging, and mortality in the company of others walking the same road.

**What it is, in shape.** A cross between a broadcast social network and a private messenger —
public-facing coping and connection on one side, private conversation on the other. People post
their legacies and their experiences, search for others by how they are coping, make friends,
message privately, and can include friends they make on Posterity in the legacy they are building.
A healing place and a place to socialize, framed around the legacy journey rather than around
illness.

### The Walled Garden
Nothing shares outside of Posterity, ever. No external sharing to Facebook, Instagram, or any
outside platform. Every share action is internal — content moves only between surfaces inside
Posterity Social.

The absence of outside sharing does two jobs. It is the **mechanism of the community's specialness**
— a protected space that cannot be screenshotted out or forwarded away. And it is a **structural
safety wall**: because there is no field for pasting outside links, external links are effectively
impossible, which removes the single largest spam and scam vector before any moderation is needed.

### The Search System
The search system is the most important part of Posterity Social. Two systems working together.

**The Focus (internally, the Root).** A separate, structured block — *not* a tag. The core context
that everything else branches from. Autofilled from a canonical, prebuilt list drawn from an
established medical vocabulary, with stages built in, so people select from a controlled set rather
than typing freely. **A Focus is not always a disease** — *Aging* and *Legacy / Posterity* are also
valid Focuses, so the space is not framed as disease-first for people whose context is not a
diagnosis. The Focus block is kept entirely separate from the general tag system: diseases can never
be general tags, and general tags can never contain a disease.

The Focus list is built automatically and prior to launch. Nothing about it is hand-maintained. It
is drawn once from an existing standardized medical vocabulary, shaped into the autofill structure,
and shipped. New diseases are added rarely enough that this is not a maintenance concern for years.

**The general tag pool.** The universal facets — how a person copes, expresses, and engages. The
same tags for everyone, chosen from an autofilled list. Users do not create custom tags at first
(may be added later, not initially).

**The disambiguation principle: the Focus resolves the tag.** A general tag such as "Shaking" or
"Episodes" is intentionally ambiguous on its own and carries no fixed meaning. The Focus at the head
of a search resolves it. "Shaking" under Parkinson's, under hyperthyroidism, and under anxiety
returns three entirely different populations from one tag. **The tags are deliberately generic so
the Focus can specialize them.** This is what lets a few hundred tags cover thousands of
context-specific meanings without the pool exploding — the same branch on a different trunk. The
Focus is never just another value in the ranking math; **it is the coordinate system the whole
search runs inside.**

**Search logic:** if a Focus is present in the query, it becomes the trunk and the general tags rank
people within it. If no Focus is present, the general tags rank across the general population.

### The Sub-Tag Pool
Grouped by category; grows toward the hundreds over time. Autofill keeps a large pool usable — a
person only sees tags relevant to what they're typing, so pool size never burdens the user. Tags are
kept to single, short concepts, because the Focus and the community already carry the nuance, and
short tags autofill better.

> 📋 **MISSING — the tag card was cut off in transmission.** The spec ends mid-sentence at
> *"Communication & Relationships"*. **Get the full sub-tag pool card from Jeremy.**

---

## HOW THE TWO LAYERS FIT TOGETHER

**Delivery** (what happens after a customer is gone) goes **out** — to Facebook, Instagram, email,
and SMS, per the context document. **Posterity Social** (what the living phases feel like) stays
**in** — walled, nothing shared outward.

The walled garden is a rule about **Social**, not about delivery. That resolves what looked like a
contradiction: a customer's 34-year-old daughter, who has never heard of Posterity, still receives
her father's message — on his Facebook wall, or by email or text. She was never expected to join a
paywalled network built for the elderly and the dying. *(This was logged as blocking question Q1;
it is now answered.)*

---

## 🔴 META DELIVERY — see **`META_DELIVERY.md`**

Delivery risk has its own note now, because it outgrew this file and because it is the one Jeremy
should read directly: **`BUILD/META_DELIVERY.md`**.

The short version. His fallback chain is four layers deep — Buffer → Meta Business API → direct
platform login (stored password + Posterity-controlled 2FA) → manual override — and it is genuinely
well built. **It answers the token-expiry problem** (staff who can log in can re-authorize Buffer
forever), and his register's verdict that the Meta API is *"an inconvenience, not a risk"* is correct
for the risk he named.

**But all four layers depend on one thing: being able to log in.** And one event removes that
permanently, for all four at once — **memorialization**, which any relative can trigger with an
obituary link, which locks the account against all posting forever, and which **appears nowhere in
the project documents.** Worse, the recipients Posterity delivers to *are* the people most likely to
report the death — so the more effective the product is, the more likely it ends itself.

Conclusion is not "drop Meta." It is **"Meta cannot be the channel Posterity guarantees."** Email/SMS
is the spine; Meta is the bonus channel. Hence email-first delivery.

---

## OPEN QUESTIONS AND RISKS (Claude's — for Jeremy)

### ✅ Q1. Who receives a delivery? — **ANSWERED**
Facebook, Instagram, email, and SMS, per the context document. The walled garden governs Posterity
Social, not delivery. See "How the two layers fit together" above.

### 🔴 Q2. The search system is also a targeting database
Search by Focus + stage means a stranger who pays **$9.99** can enumerate every **Stage 4 pancreatic
cancer** member — the most frightened, most vulnerable, shortest-horizon people on the platform —
and then **DM them privately**. Elder financial exploitation and terminal-illness fraud are two of
the largest scam categories in existence, and this feature set assembles their target list.

The walled garden stops *link* spam. It does **not** stop a human predator who has paid the entry
fee, and it does not stop miracle-cure misinformation sold to desperate people.

**This does not mean don't build it. It means the DM system cannot ship open:**
- **Mutual-consent messaging only** — a request, then an accept. No unsolicited DMs, ever.
- **Report and block from day one.** Not a v2 feature.
- **Rate limits** on search results, profile views, and friend requests.
- Lean on the **$9.99 gate** — it puts a real card behind every fake account. That is a genuinely
  good anti-abuse moat; use it deliberately.

### 🔴 Q3. "Stages built in" is not something you can download
**There is no medical vocabulary with a generic `stage` column.** Staging is disease-specific and
mutually incompatible:

| Condition | Staging system |
|---|---|
| Cancer | TNM / Stage I–IV |
| Parkinson's | Hoehn & Yahr 1–5 |
| Kidney disease | CKD 1–5 |
| ALS | King's or MiToS |
| Dementia | CDR / FAST |

SNOMED and ICD encode these separately per condition — not as one shared field. "Drawn once from a
standardized vocabulary, shaped into autofill, shipped" will produce **names, not stages.**

**The practical build:** you do not need 70,000 diseases at launch. Curate the **~50–100 conditions
people will actually join over**, hand-attach the correct staging scheme to each, and let the long
tail carry no stage. That's a day of work instead of an unsolvable one. It also means the Focus list
*is* lightly hand-maintained at the top, contrary to the spec — and that is fine and cheap.

**Licensing to confirm before depending on one:** SNOMED CT is free in the US via the NLM but
requires registration; ICD-10-CM is outright free. Verify the terms.

### 🔴 Q4. A member is going to die mid-conversation
That is not an edge case — **it is the entire point of the product.** What do their friends on
Posterity Social see? The spec doesn't say, and **there is no acceptable default**: silently
vanishing is cruel, and a profile that simply keeps sitting there is worse. This is the most
emotionally load-bearing screen in the app and it must be designed on purpose.

### 🟠 Q5. Consumer health data is regulated — and this one has teeth
HIPAA almost certainly does **not** apply (Posterity is not a provider, payer, or clearinghouse, and
self-disclosed health information is not PHI). But storing *"user X has Stage 4 pancreatic cancer"*
is **consumer health data** under **Washington's My Health My Data Act** — which applies to anyone
serving Washington residents, requires separate consent and a specific privacy notice, and, the part
that matters, **carries a private right of action**: individuals can sue directly. Nevada SB370 is
similar. GDPR Article 9 would apply to any EU members.

Worth an actual lawyer's hour before launch. It is far cheaper to design for now than to retrofit.

### 🟡 Q6. The empty room
A paywalled social network launches with zero members. Day one, a person pays $9.99, opens Social,
and finds nobody there. Exclusivity is an **end state**, not a launch state.

This is survivable **because the network doesn't have to carry acquisition** — people join for the
legacy builder, and Social is the thing that makes them stay. The corollary is a marketing
instruction: **do not sell Posterity Social as the reason to join until there are people in it.**
Sequence matters.

---

## WHAT THIS DOES NOT CHANGE

**Phase 0 is untouched.** Signup, the auth gate, the checkout identity fix, and the Stripe webhook
are identical no matter where content is eventually delivered. None of those four are delivery.

Posterity Social is a **second schema** — profiles, focuses, focus_stages, tags, profile_tags,
posts, post_tags, friendships, conversations, messages, reports, blocks — sitting on top of the same
`accounts` spine, exactly as the spec says it should. **Nothing in the 2026-07-13 migration is
invalidated by it**, and the `deliveries` table's channel column already accommodates social, email,
and SMS side by side, as the context document always intended.
