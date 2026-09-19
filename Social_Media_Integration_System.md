This file is an export of the Social Media Integration System Google Doc. The Google Doc is authoritative. Every edit is made there, never here, and this copy is refreshed periodically, so it may lag behind the Doc.

# **P O S T E R I T Y**

## *Social Media Integration Design Record*

**This document is the complete record of the social media integration architecture. It covers what the architecture is, how each decision was reached, and why each holds. It is a working reference for Posterity, its collaborators, and legal review. It is flagged internal and is not customer-facing. A summary of this architecture sits in the main context, which points here for the full detail. This document is the single authoritative copy of every rule it contains.**

# **THE PAGE ARCHITECTURE**

Facebook memorialization permanently locks a personal profile.  Much of the following architecture is built in order to guarantee Posterity's ability to post to Meta on behalf of its customers regardless of an account's memorialization status. 

### **The mechanism**

A Facebook Page is a separate platform object from a personal profile. It survives memorialization of the profile, provided another administrator is already in place.  
When a customer’s profile is memorialized, their own administrator role on the Page is stripped. Any Page the account was sole administrator of is removed. Where administrators other than the customer were already appointed, the Page continues operating under them. Posterity is that other administrator. The role is granted by the customer while alive, and it persists after memorialization.

### **Problems the Page architecture solves**

* Video length — a Page carries a standard video route separate from Reels, so the ninety-second eligibility rule never applies to a Posterity delivery.  
* Profile unreachability — Pages are the only reachable object, so the Page becomes the product rather than a workaround.  
* Access at scale — Business Portfolio, Meta’s own container for a company’s Pages and applications, is the sanctioned structure for holding many Pages, so volume stops being a liability.  
* Terms exposure — an administrator grant is a sanctioned feature. No credentials change hands.  
* Memorialization — the customer’s role is stripped, but the Page stands because Posterity’s role is already in place.

### **Durability**

Pages have existed since 2007, formal administrator roles since roughly 2012, and Business Portfolio since 2014\. The mechanism has survived multiple full platform overhauls, including the Pages rebuild between 2020 and 2022\.

The structural reason it is safe is that Pages are the surface businesses advertise through. Profile posting and Groups publishing generated no advertising revenue. Pages do, so Meta has no incentive to break the surface its own revenue runs through. The reasonable expectation is tightening at the edges rather than removal. This includes rate limits, video specifications, and review requirements.

# **ACCESS CONTROL STRUCTURE**

### **Meta’s access model**

The older role system — Administrator, Editor, Moderator, Advertiser, Analyst — has been retired. Administrative authority over a Page now splits into two kinds of access. Facebook Page administration allows multiple people to hold access to a Page at the same time, and access comes in two kinds. The first lets a person switch into the Page and act as the Page directly on Facebook, held at either full or partial control. The second, task access, is narrower: it grants specific jobs through Business Suite or Business Portfolio and never allows anyone to switch into the Page itself. Posterity uses Facebook access at both levels and does not use task access at all. Task access sits outside the full and partial ladder, so a person holding it cannot be promoted to full control. A co-administrator must be able to accept full control at handoff.

### **Full control**

Full control is the modern equivalent of the old administrator role. A person holding it can manage all Page settings, publish and manage content, add and remove other people, and delete the Page. Only a person with full control can grant full control to someone else.

Full control carries the ability to remove other people from the Page, and that reaches other full-control holders. Two full-control holders can therefore remove each other. To close this, Posterity confirms at setup that it is the Page's only full-control holder. With no equal-tier holder on the Page, no one can remove Posterity’s access. Any access granted to others is partial and remains so until the Page is handed off.

### **Partial control**

Partial control replaced Meta’s Editor role. A person holding it can publish content, respond to comments, and reply to messages as the Page. They cannot change Page settings, and they cannot add or remove other people.

### **Why the asymmetry matters**

Because full-control holders can remove each other, a co-administrator holding full control could remove Posterity unilaterally. The full-and-partial split resolves it. Posterity holds full control. Co-administrators hold partial control. Partial control does not include Page settings, and Posterity is the only full-control holder, so no co-administrator can displace Posterity or another co-administrator. The mutual-removal problem exists only between two full-control holders, and that configuration occurs nowhere except inside the handoff sequence, which is designed for it. This was the shape floated as desirable before the role system was checked. It turns out to be exactly what Meta supports.

### **Why Posterity must hold full control**

Posterity’s full control does three jobs after the account’s Active Phase ends.

* It keeps the Page in existence. A Page with no full-control administrator is removed by Meta. If Posterity released the role and only partial-control holders remained, the Page would be destroyed rather than preserved.  
* It is the only route to transfer. Only full control can grant full control. If Posterity left, no co-administrator could ever be promoted, and the transfer would become permanently impossible rather than merely pending.  
* It enables deletion. Without full control, Posterity could not close the Page down at its specified time.

There is no version of this architecture in which Posterity releases control before the handoff and the system still works. The role is dormant once delivery has finished — no monitoring, no posting, no moderation — and it exists so that the Page does not vanish before the person it is meant for claims it.

### **A grant is not access**

When access is granted, the recipient receives an invitation and must accept it before anything changes. Nothing is instant on their side. This has a direct consequence for verification. The system must check for an accepted grant, not a sent invitation. A customer who has invited a co-administrator has not completed setup.  
It has the same consequence at the other end of the Page’s life. A co-administrator holds nothing until they accept their invitation within Meta, so the handoff cannot be executed as a single action. The mechanics are set out in Transfer mechanics.

# **AUTHORIZATION AND GATING**

### **Social media is blocked until authorization**

Page verification is an account-level block on social media as a delivery method rather than a per-piece gate. Social media does not appear in the delivery method list at all until the check has run. This placement was chosen deliberately. A per-piece check would allow a customer to build a delivery entry that later fails validation. An account-level block means no such entry can ever exist. There is nothing for the Delivery Builder to catch, because nothing invalid can be entered.

### **Authorization is locked behind plan initiation**

Authorization requires at least one plan to have been funded, or initiated, within the account.  
Social media delivery is a paid-tier feature and Horizon carries no deliveries, so gating it behind initiation matches what the customer has actually purchased. The grant of administrator control is also the heaviest task in onboarding, so it belongs after commitment rather than in front of it.

### **Page creation is separate from connection**

Creating the Page and connecting it to Posterity are two different steps, and only the second is gated.  
Customers are encouraged to create their Page as early as the Horizon Phase. Posterity is not involved in that step and requires no access to it. The customer builds the Page, invites their people, and publishes the template post to their own personal profile. This preserves the follower-accumulation runway while keeping Posterity’s portfolio free of Pages attached to accounts that never fund a plan.

### **Authorization is held at account level**

Once an account is authorized, social media deliveries can be built into any subsequent plan without those plans being initiated. Authorization attaches to the account rather than to any individual plan.

### **Verification is programmatic**

Verification is a read call. Posterity’s server asks Meta what role it holds on the Page, and Meta answers. No staff member is involved and no manual sign-off is required.

The call checks that Posterity holds full control and, where the customer elected the transfer path, that at least one co-administrator has accepted partial control. Social media unlocks only when the conditions that apply to the customer’s chosen path are met, so setup cannot be left half-complete without the customer knowing. The check is instant, so verification completes as soon as the last required invitation is accepted. Where the co-administrator accepts while the customer is still in the flow, that is the same session.

### **One-time verification, not continuous**

Verification runs once at setup. Continuous verification and a periodic automated Page check on the Operational Dashboard were both considered, and neither is being built.

The reasoning is the same for both. The existing fallbacks already absorb later failure. A social media delivery that cannot publish routes through its Alternative Recipient sequence, or to the Master Recipient where no sequence exists, and Legal discharges the obligation on arrival rather than by route. Against that, a repeat check earns too little to justify its cost.

Two costs are accepted rather than solved. The customer never learns that their Page has broken, since it surfaces as a failed delivery during the Active Phase when they can no longer fix it. And every social media delivery in the plan then lands on the Master Recipient, which is described as a route of last resort rather than a bulk destination. If a repeat check is ever wanted, the cheapest form rides the existing six-month check-in as a customer-facing prompt rather than a new system.

### **The failure signal**

When Posterity’s role on a Page is lost, a publish attempt fails with a specific error indicating that the user associated with the token no longer holds an appropriate role on that Page. The token itself remains valid.  
This arrives on its own at publish time and costs nothing to receive. It does not solve the problem of the customer never learning, but it does mean a failed social media delivery reports why it failed rather than failing opaquely.

### **Relationship to the Social Gate**

There are two gates and they sit on different layers.  
Page verification governs whether social media is available as a delivery method at all. It is an account-level condition and it lives entirely outside the Delivery System.

The Social Gate governs how social media can be used once it is available. It is a per-entry condition inside the Delivery Builder, requiring that every social media entry has a route off the platform — satisfied account-wide by a Master Recipient, or per entry by an Alternative Recipient sequence. Keeping them separate is what allows the Delivery System to remain closed. Verification never touches it.

# **PAGE ADMINISTRATION AND TRANSFER**

Posterity holds full control of the customer’s Facebook Page from the point of authorization until the Page is transferred or deleted. This is not custodial. The role keeps the Page in existence and keeps a transfer possible, for the reasons set out under Why Posterity must hold full control.  
The conditions that gate authorization are set out in the Authorization and Gating section. At authorization, the customer chooses one of two paths.

**Page transfer** — The customer names at least one co-administrator, granted partial control in Meta. Priority order is covered under Co-administrator priority; the handoff itself is covered under Transfer mechanics.

**Page deletion** — The customer instructs that the Page end rather than transfer, and chooses when. *Delete Page after all account deliveries are finished* ends the Page at the start of the first Reprise year. *Delete Page with the account* holds the Page for as long as the account lives, and both end together at the Posterity Transition. Neither requires a co-administrator. Content the customer marked Include in Posterity remains available to Legacy Guards throughout the Reprise Phase regardless of which path is chosen.

Any of these choices can be changed at any time prior to the account being edit locked at entry into its Interlude Phase. The same bound applies to adding co-administrators and to requesting a change in their priority order. The Page returns to a customer who deletes their account before that point. Posterity promotes the customer to full control and then removes itself, the same two actions it takes at handoff.

### **How the two paths were arrived at**

The transfer path came first and was originally the only path. The problem it left open was the customer who does not want their Page to continue at all — a legitimate wish with no expression in a design where transfer is the only outcome.

Making Posterity’s administrator role optional was considered and rejected, because opting out means no administrator, which means the Page is removed, which means there is nothing left to transfer and nothing for a co-administrator to accept. It is not a preference; it is a switch that deletes the outcome.  
The real choice sitting underneath it was whether the Page should continue after delivery finishes. Expressed as a path rather than a toggle, it works cleanly: a customer electing deletion needs no co-administrator, which also removes the requirement to recruit anyone.

### **Co-administrator priority**

Co-administrators are prioritized in the order they are added. The order is visible within User Profiles, and reordering is done by contacting Posterity. The ordering lives in Posterity’s own records rather than in Meta. Meta knows only who holds partial control and has no concept of rank. The order matters at exactly one moment — deciding who is approached first when the handoff cascade opens — so Posterity holds the order, Meta holds the access, and the two never need to agree.

Showing the order within User Profiles rather than only stating the rule at setup is deliberate. A customer adds a second co-administrator without registering that second means second, and a rule stated once during onboarding will not be remembered years later. A visible list is self-correcting, and it surfaces the reorder request while the customer is alive to make it. Reordering stays a manual staff request rather than a self-service control. It is rare, it is consequential, and a staff touch is inexpensive at that frequency.

### **Multiple co-administrators**

Multiple co-administrators are supported, and there is no meaningful limit on the number of partial-control holders. They can be added at any point before the account is edit locked, since Posterity holds full control and full control is what grants access to others.

The benefit is direct. A timeline can run a decade, and the user base skews older. A named co-administrator may die before the customer, lose their Facebook account, or become someone the customer no longer speaks to. A single unresponsive co-administrator ends the transfer, so naming more than one is what keeps the transfer available.

### **Transfer mechanics**

At handoff, Posterity promotes the accepting co-administrator from partial to full control, then removes itself. Two actions in sequence. Posterity is never handing an asset to a stranger. It is promoting a person the customer chose, in writing, years earlier.

Two constraints apply. The promotion requires the co-administrator to accept, so they must be alive and responsive at handoff time, which is what the cascade exists to establish. And Posterity cannot remove itself before the promotion is accepted, because a Page left without a full-control administrator is removed by Meta.

### **Why this resolves the estate exposure**

The exposure previously on record was that Posterity becomes sole administrator of an estate asset once the customer’s role is stripped, with no standing to hold it indefinitely. Four things resolve it. There is no indefinite hold — the Page is transferred or deleted at a defined point. There is no unilateral transfer — the recipient was named by the customer while alive. The setup record documents the customer's own instruction, which is the thing that matters in a dispute. And a Facebook Page carries no estate value worth litigating, so the theoretical claim has no practical form.

Asking customers to formally exclude the Page from their estate was considered and rejected. A customer cannot reliably contract away how their estate is administered, so the clause would not do what it appears to do, and it introduces probate language into a setup flow that otherwise carries none.

The stronger instrument is one Posterity does not write. Under the digital asset framework adopted in most states, a platform’s own designation tool outranks both a will and the platform’s terms of service. Walking the customer through setting their Facebook Legacy Contact during setup does more legal work than any paragraph Posterity could draft.

### **What a contract can and cannot reach**

A contract can protect against refund exposure and breach claims, bind duties the customer can perform while alive, and capture consent to a defined failover. Granting administrator control is exactly the kind of duty a living customer can perform, so that part is genuinely enforceable. It cannot bind Meta, cannot bind heirs, cannot outrank a platform designation, and cannot make a post publish. The first of those is why the no-transfer language matters and the estate question does not: a contract can settle what the customer wanted, but only Meta decides whether the handoff is permitted. Shifting the memorialization burden to the customer was rejected on this basis — it is a duty with no available means of performance, since the customer is not there when it matters.

# **THE HANDOFF CASCADE**

### **Reprise Phase Page Sequences**

At the start of each Reprise year, two automatic system checks determine what happens to the customer’s Facebook Page. The first checks whether the customer elected to delete the Page after all account deliveries are finished. If so, an Operational Dashboard task is created directing staff to delete the Page. Where the customer elected to delete the Page with the account, no task is created here and the Page ends at the Posterity Transition instead. The second check occurs only where the first confirms that Page deletion was not selected. It scans for a non-recurring storage fee payment covering the year ahead within the account. Where the payment is found, nothing further occurs and the check repeats at the start of the following Reprise year. Where no payment is found, the transfer cascade begins.

The cascade opens with a unique first notification to the highest-priority co-administrator, requesting that they accept transfer of ownership of the account's Facebook Page. An Operational Dashboard task is created for staff to request the transfer within Meta. Separately, the account’s primary Legacy Guard receives their own notification informing them that a Facebook Page transfer request has been generated.  
Where no response is received, every co-administrator receives each remaining sequence-labeled notification. This occurs once every three months following the initial contact attempt, and lasts until November 1st — when a unique final notification is sent.

 The cascade states that the Page is scheduled for deletion on January 1st if they choose not to accept ownership. Acceptance by any co-administrator ends the sequence for everyone. Nothing else ends it. A co-administrator who replies without accepting has not stopped the cascade, and the remaining notifications continue as scheduled. Where two co-administrators accept within the same window, the first acceptance recorded takes the Page. Priority order decides who is asked first rather than who prevails once the ask is open to everyone. Where no co-administrator accepts, the Page is deleted on January 1st. Every Legacy Guard on the account is notified of the outcome either way.

A storage fee paid by a Legacy Guard during the Reprise Phase stops the cascade notifications automatically. A high-priority Operational Dashboard task is then generated to rescind the transfer request within Meta, and every Legacy Guard on the account is notified that the cascade has stopped. The cascade does not restart within the purchased year. The fee check runs again at the start of the following Reprise year, and where no payment is found the cascade opens as it would have.

### **Why quarterly**

The cadence was initially drafted at two notifications per month, copied from the check-in cascade. That was wrong, and the reason it was wrong is instructive. The check-in cascade is trying to prevent a false trigger — non-response there means someone may have died, and every notification carries that weight.  
Nothing here carries it. A co-administrator who does not answer produces a deletion the customer already chose and understood. The consequence is defined in advance, so the pressure should not be applied.  
Quarterly sits between the Legacy Guard invitation's six-month rhythm and the two-per-month cascades. It is frequent enough that a co-administrator who wants the Page is unlikely to miss every contact, and spread enough that the sequence does not read as pressure. Across a full cascade year it produces five contacts: the unique first at the start of the cascade year, three sequence-labeled reminders, and the unique final on November 1st.

### **Why the dates are literal**

The Reprise Phase begins on day one of the year following an account’s final active plan year, and each subsequent Reprise year begins on day one likewise. Because the phase start is fixed to the calendar, the cascade dates can be stated as real dates rather than as durations relative to an event.  
This matters for building. A schedule can be built from November 1st and January 1st. It cannot be built from a phrase such as "shortly before the Posterity Phase begins."

### **Legacy Guard notifications**

Two notifications are tied to this cascade, and neither is part of it. The first, at cascade open, informs the account’s primary Legacy Guard that a transfer request has been generated — different content, different purpose, no ask attached. The second, at close, reports the outcome to every Legacy Guard on the account. It is sent on any of the three ways a cascade closes: a co-administrator accepts, the Page is deleted on January 1st, or a storage fee payment stops the cascade. Where the cascade opens again in a later Reprise year, the sequence runs in full and both notifications fire again.

These are standalone messages rather than a sequence. The Legacy Guard is asked to do nothing about the Page and is not a co-administrator by default. A Legacy Guard may purchase additional Reprise years, but that is a storage decision rather than a Page decision.

### **Why the Legacy Guard is not the co-administrator**

Earlier design work collapsed these roles, treating the Legacy Guard as the Page co-administrator by default. They are separate.  
Three roles exist, and all three can be different people. The Legacy Guard holds authority and confirms that an account should move forward. The Master Recipient receives content when all other routes are exhausted. The co-administrator receives the Page. A customer may name the same person to all three, but nothing in the system requires it.  
Adding a fallback route to the Legacy Guard — allowing them to accept the Page if no co-administrator does — was considered and rejected. It reintroduces the collapse, and the terminal state already handles failure. If nobody accepts, the Page is deleted, which is a defined outcome rather than a gap.

### **The storage fee interaction**

Additional Reprise years can be purchased, either in advance by the customer or during the phase by a Legacy Guard. Because the Reprise Phase can therefore extend past its free initial year, the cascade has to account for it in both directions. Both branches are stated above, under Reprise Phase Page Sequences.

The Meta-side rescind is the part that would be easy to miss. A transfer request already sent does not withdraw itself, so it stays live in Meta until staff withdraw it. Posterity executes the promotion by hand, so an acceptance arriving after payment cannot complete the transfer on its own, but the open request should not be left standing against an account that has paid to continue.

### **Channel**

Co-administrator setup captures name, email, and phone number, and naming a co-administrator emails them a link to agree to texts. The cascade is sent through the Communication Dispatch System and follows its channel policy, held within the Master Specification.

# **CONTENT REVIEW**

The following is the operative clause as approved.  
All content scheduled for social media delivery is subject to review by Posterity staff prior to delivery. Customers are responsible for creating content that complies with Meta’s Community Standards, and Posterity reserves the right to refuse social media delivery of any content that does not. Refused content is delivered through the entry’s Alternative Recipient sequence, or to the Master Recipient where no sequence exists.

### **Detection at upload**

All content is scanned for nudity at upload. Content carrying a social media entry is additionally checked for potential Meta Community Standards violations when that entry is committed. Detection is advisory until the system has been tested and verified against real content, and it becomes blocking once it has. The testing belongs to the build rather than to this document.

Detection at upload catches the obvious case years earlier, while the customer is alive and can replace the content. That is its purpose, and it is a different job from review at delivery.

### **Review at delivery**

Every social media delivery is reviewed by staff before posting. One review, and it happens before the delivery date rather than at finalization. The Community Standards requirement is stated at setup and carried in the terms, so the customer is informed even though the check happens later.

A second review at finalization was considered and rejected. Social media carries no upcharge — it draws from the plan’s existing delivery pool — and a second review pass is not justified for a feature the customer is not paying extra for.

### **Where review sits in the flow**

Review happens before each post's delivery date. On the first of each month, one Operational Dashboard task is created covering every social media delivery due the following month, and its priority climbs through the final week before that month begins. Each post's own priority climbs again through the week before its delivery date. Every post must be marked reviewed before it can be delivered, and it can be reviewed through that task or through the staff delivery system. A post still unreviewed on its delivery date is held unpublished as a top-priority task and publishes once it is approved. Any staff member can approve or refuse a post, and a refusal records its grounds.

### **Why human review regardless of detection accuracy**

Meta offers no pre-publication check. Nothing can be validated against their policies before it posts.  
Nudity is the detectable case. The harder ones are context-dependent — a war photograph, a hunting picture, an old medical image — cases that no classifier reliably predicts and that Meta may or may not action.  
There is also a reason independent of compliance. A social media delivery is the only delivery that is public and irreversible. An email to the wrong recipient is a private mistake. A post to a Page is visible to everyone the customer knew, permanently, at the worst possible moment.

### **Volume**

Social media posts are capped at one, four, and twelve per plan year across the Basic, Premium, and Legacy tiers. Against the illustrative seventy-five-customer mix, that is well under a thousand social media posts annually across the whole business, spread across the calendar.  
The labour model already assumes a per-post cost, so mandatory review adds almost nothing operationally.

# **PUBLISHING ARCHITECTURE**

### **Buffer is retired**

Buffer was the intended posting layer. It is no longer part of the architecture. Four things drove the decision, in order of weight.

The first is dependency. Posterity’s promise is that content arrives years from now. Buffer is a third party sitting inside that chain. If Buffer changes terms, is acquired, drops Meta support, or raises prices in year four, deliveries break — and by then the affected customers cannot be consulted or asked to re-authorize anything. Migrating off Buffer late is not a vendor swap; it is an unrecoverable state.

The second is the routing rule. Buffer routes by aspect ratio alone: any video uploaded to Facebook at a nine-by-sixteen aspect ratio is published as a Reel. Since that is how most people hold a phone to record themselves, it is the default outcome rather than an edge case — and the Reels endpoint is where the ninety-second ceiling lives. The decision to route that way is Buffer’s, not Meta’s.

The third is cost, which is far worse than the fifteen dollars per month the fixed-cost baseline assumed. Buffer bills per connected channel rather than a flat fee, and every customer Page is a channel. Adding Instagram would make it two per customer. Posterity requires the team tier, which runs ten dollars per channel, because the single-user tier cannot support the Director, Manager, and Staff access structure. At the illustrative seventy-five-customer mix that is a recurring monthly cost in the hundreds, growing with every customer.

The fourth is that Buffer never absorbed the liability it was thought to. Buffer holds a revocable token; Posterity holds the administrator role. The estate exposure is identical either way. Buffer also reintroduces the personal-account dependency the system user architecture exists to eliminate, because connecting a Page to Buffer requires a staff member to sign in with a Facebook account holding administrator rights on that Page.  
One case for Buffer survives and is worth recording. Buffer already holds Meta’s approvals, so it would allow publishing to customer Pages before Posterity’s own application review clears. That gap does not exist under the launch sequencing adopted here, since social media is shipped blocked until approvals complete. Buffer is not retained on that basis. Using it would mean re-adopting it, which would mean re-adding the account creation and integration work removed from the roadmap.

### **Direct Graph API integration**

Posterity publishes through its own registered application. Publishing is fully automated — no browser, no login, no staff member at a keyboard. It is more automated than the Buffer route rather than less. Staff review gates whether an item is released to the publishing queue; it does not sit inside the publish call.  
Manual login remains only where it already sat: the Post Manually override for failures, which logs timestamp, staff member, task identifier, and reason.

### **Where the publishing code sits**

It is not customer-facing and it does not live in the Content Builder. It is a background service.  
The Content Builder writes what is due and when into Supabase, drawing its recipients from the Delivery Builder within it. A scheduler wakes on a cycle, asks what is due, and hands each item to whichever channel it is addressed to. Email goes out through Postmark. Text message goes out through Twilio. Social media goes out through Meta.

This is the same engine as the customer-facing notification cascades, with social media as a third outbound channel beside email and text message. Same trigger, same queue, same failure logging, three destinations.  
The Operational Dashboard sits beside this rather than inside it. It reads results and surfaces failures as tasks. It does not do the posting.

### **The token architecture**

A token is the credential Posterity’s software presents to Meta with every publish request. Administrator status is the permission; the token is what proves it on any given call. By default Meta issues tokens to people. A token generated when a staff member connects a customer’s Page traces to that staff member’s personal Facebook account, and it dies when they change their password, lose their role, or leave. For a delivery obligation measured in years, that is fatal.  
A system user is Meta’s own answer. It is an account inside a Business Portfolio that represents software rather than a person — no login, no profile, no feed. Its tokens do not expire and are not attached to anyone’s password.  
A Business Portfolio, formerly Business Manager, is the container a company owns, holding its applications, system users, and any Pages shared into it. Posterity holds one. When a customer grants administrator control, their Page is shared into the portfolio.

The resulting shape: Posterity’s Business Portfolio holds a system user, customer Pages are shared into the portfolio, and the system user holds one permanent token that can publish to all of them. No staff member’s personal account appears anywhere in the chain.  
Alternatives were considered and are worse. A never-expiring Page token can be generated from an individual’s account, but it is still an individual’s account. A third-party intermediary holding the approvals is what Buffer is, and it was retired for the reasons above.

### **Rate limit posture**

Calls made with a Page or system user token fall under Business Use Case limits rather than the general platform limit. This is a secondary benefit of the system user architecture rather than a reason for it, and it is not a live constraint at Posterity’s scale.

### **Endpoint control**

Direct integration returns the endpoint decision to Posterity. Meta exposes two separate video publishing routes for a Page. The standard video endpoint publishes to the Page's own video feed. The post reaches the people who follow the Page, and no length constraint within it is one Posterity would reach. The Reels endpoint publishes into Meta's short-form discovery surface. That surface serves video to people who do not follow the Page, and it admits only videos of ninety seconds or less. Posterity publishes through the standard endpoint in every case. The audience is the customer's own followers, and the content has no reason to be short.

### **How the file reaches Meta**

Meta accepts a video two ways, and the choice matters because one of them moves the file through Posterity's server and the other does not. The hosted route passes a URL. Posterity hands Meta a link to the file and Meta fetches it directly. Nothing transits Posterity's infrastructure and no bandwidth is spent on the delivery. The file already sits at a Supabase signed URL, because that is how the same content reaches recipients by email and text message, so this route reuses what the Delivery System has already produced. 

The local route uploads the file as binary data through Meta's Resumable Upload API, which exists for large files and can resume an interrupted session. It is the documented path for video at size, and it is the safer assumption until the hosted route is confirmed against the standard Page video endpoint. 

The hosted route is easier to perform at scale, so it will be the preferred method. The local route will serve as a fallback option. Which is used is confirmed during build testing rather than assumed in this document. 

One condition attaches to the hosted route. A Supabase signed URL expires, and Posterity's expire after ninety days. The link must be live at the moment Meta fetches it, which it will be for a scheduled delivery, but a retry after a long failure could fall outside the window. The publish call generates a fresh signed URL rather than storing one. 

# **META APPROVALS AND SEQUENCING**

### **The application registration**

Posterity registers an application with Meta. This is not software to be built. It is an entry in Meta’s developer system that identifies Posterity’s server when it makes requests.

### **Standard versus Advanced Access**

By default an application can only publish to Pages owned by its own developers. This is Standard Access, and it is sufficient for building and testing. Publishing to a customer’s Page requires Advanced Access on the page publishing permission. Advanced Access requires two separate approvals, each on its own timeline.

### **Application Review**

Meta reviews the software. Each permission requires a written justification describing exactly what the application does with it, what user benefit it enables, and how the data is handled. Generic descriptions fail; reviewers need the specific flow.

A video demonstration is required for every permission. The recording must show a complete working flow — a test user holding an actual Page administrator role, granting the permission, and the feature performing the exact function stated in the justification. A single missing step means rejection for that permission.  
Expect one to three weeks and at least one rejection.

### **Business Verification**

Meta separately verifies that Posterity is a real legal entity. This requires business documents, domain verification, and occasionally a phone call. It runs on its own timeline and is a common hidden blocker — applications pass review and then wait again. It requires no product and no code, which is the point.

### **Permissions**

The page publishing permission requires review. Two others Posterity uses — listing Pages and reading Page engagement — do not.

### **Business registration is a prerequisite**

Posterity is not currently registered as a business. Business Verification requires real documents, so entity formation sits in front of it.  
Formation does not require a live product. Business Verification examines the legal entity rather than the business’s operations, so this can be completed well before launch.

In Louisiana the filing fee for articles of organization is one hundred dollars, with a thirty dollar annual report thereafter and a small surcharge for filing online. Online filings process in roughly one to two business days. A registered agent costs nothing where a reliable in-state street address is available. Where one is not, commercial services run between one and three hundred dollars annually. An employer identification number from the federal government is free, and Meta’s Business Verification carries no fee. These figures should be confirmed rather than relied upon, and formation is a matter for professional advice rather than for this document. The total is a few hundred dollars — among the least expensive items on the build list, and the one that unblocks a multi-week external clock.

### **Launch sequencing**

Social media is built and shipped in a blocked state, and unblocked when the approvals clear.  
The account-level authorization gate is the right place to seat this. The gate’s own condition is Posterity’s role on the Page rather than Meta’s approval status, so it does not read approvals itself. At launch, verification is withheld for every account until Advanced Access clears. 

No new blocking surface is built — only a launch-wide hold on releasing verification. While the hold is in place, social media appears in the delivery method list greyed and labeled as coming soon, so a customer who has completed authorization sees that the method exists and is not yet available. The authorization surface in User Profiles carries the same label.

The practical consequence for the build order is that Business Verification should begin as early as possible, because it depends on paperwork rather than code and there is no reason to serialize it behind development.

# **RISK AND ENFORCEMENT**

### **Volume is not the risk**

The fear worth retiring first is that holding many customer Pages is itself a problem. The Business Portfolio exists precisely so that agencies can hold hundreds of client Pages. Meta built the structure, sanctions it, and monetizes it.

Application Review is what converts volume from tolerated to licensed. Posterity submits a written use case, Meta approves the publishing permission against that stated purpose, and publishing at scale becomes approved behavior rather than something Posterity is getting away with.

Concealing account volume was considered and rejected. Fingerprint spoofing, proxy rotation, and anti-detection browsers exist to hide terms breaches. One enforcement action would take down every customer account in the environment simultaneously, and none of it is necessary, because the Business Portfolio makes volume legitimate.

### **Reports are the main enforcement vector**

User reports are how Pages usually attract enforcement, and Posterity’s content is genuinely unusual. A post from someone who has died is emotionally surprising, and surprise produces reports — not because anyone believes it is abuse, but because people do not know what they are looking at. Meta acts on reports before it evaluates context.  
The mitigation is upstream and structural. The Page is the customer’s own, created by them. The followers opted in. The template post explains what is coming, in the customer’s voice, before anything arrives. An audience that expects the post does not report it.

### **Posting pattern**

Deliveries are individually posted and scheduled across the full year. There are heavier days, particularly around holidays, but for the most part deliveries are spread out and each account’s schedule is unique and customer-authored.

This is a property of the product rather than a mitigation applied to it, and it is demonstrable to Meta if a pattern is ever questioned. Simultaneous bulk posting across hundreds of Pages from one system is the signature of automated spam; Posterity does not produce that signature. Deliberately staggering deliveries was considered and rejected as unnecessary. The schedule is already spread by construction, which is a stronger position than staggering applied after the fact.

### **Strike accrual**

Facebook’s strike system escalates predictably. A first strike is a warning. Two to six strikes bring time-limited feature restrictions. Seven brings a one-day content restriction, eight a three-day, nine a seven-day, and ten or more a thirty-day restriction. Content violating more severe policies carries additional and longer restrictions on top. Strikes attach per Page, so this failure mode is contained. One customer’s content problem does not touch another customer.

### **Blast radius**

The concentration risk is the portfolio rather than any single Page. A Business Portfolio restriction affects every asset, user, and account within that portfolio, where an individual asset restriction reaches only that asset. So the failure mode that matters is not a customer’s Page being restricted. It is Posterity’s portfolio being restricted and every customer’s social media delivery stopping at once.  
There is a second-order consequence worth recording: a restricted portfolio may lose the ability to transfer or remove assets, which would block Page handoffs as well as publishing.

### **What absorbs it**

Every social media entry has a route off social media by construction — that is the Social Gate. Legal discharges the obligation on arrival rather than route. So a total loss of Meta access degrades Posterity to email and text message delivery. Content still arrives and the promise still holds. The Social Gate was designed to solve a per-entry routing problem. It turns out to be the mitigation for platform-wide enforcement.

### **Pricing exposure**

The commercial exposure — that Meta access is lost and Posterity cannot deliver a feature customers paid for — is already resolved by the pricing structure. The no-upcharge rule is recorded under Content Review, and it was decided deliberately because of platform instability. A customer who never posts to social media uses those deliveries as text message or email and loses nothing.

# **LEGAL POSITION**

### **Nothing here breaches Meta’s terms**

Every element of the architecture is a sanctioned feature used as designed. Posterity is an authorized administrator of a Page the customer created, publishing content the customer authored, having been granted the role by the customer while alive. No credentials change hands. No identity is misrepresented. No account is transferred. Meta's Terms of Service prohibit sharing a password, giving another person access to an account, and transferring an account without Meta's permission. Those are the three things the prior architecture did and this one does not.

### **The impersonation question**

It will be raised, and it resolves on the facts. The Page belongs to the customer, was made by them, and carries content they wrote. Nobody is pretending to be anyone.

### **The digital asset hierarchy**

Access to a customer's digital accounts after death is governed in most states by the Revised Uniform Fiduciary Access to Digital Assets Act, which ranks authority in a specific order. A platform’s own designation tool sits at the top, above a will, a trust, or a power of attorney, and above the platform’s own terms of service. This is why the Facebook Legacy Contact designation matters and why onboarding directs customers to set it. Anchoring to it is using the mechanism exactly as designed rather than working around anything. The full jurisdictional detail, including the states where adoption is unresolved, belongs in the Legal and Compliance section of the main context. It is not written there yet, and writing it is part of the legal package.

### 

### **Exposures for the legal package**

* The Page transfer against Meta's no-transfer language. This is the exposure with real weight. Meta prohibits transferring an account without its permission, and the position rests on the handoff being a promotion of an existing administrator the customer designated rather than an assignment of an account. The clause is not absolute, which is where the argument runs, but it should be confirmed rather than assumed.   
* Posterity as sole full-control administrator of an estate asset once the customer's role is stripped. Bounded by the defined terminal state, documented by the customer's own election, and limited in practice by the Page carrying no estate value worth litigating. Recorded for completeness rather than as a live concern.   
* The best-effort character of platform-dependent delivery, which the arrival-not-route framing already covers but which should be stated explicitly in the terms.  
* The log retention rule. A record spanning five to ten years of who received what is sensitive on its own, and indefinite retention is itself a liability.

# **AUDIENCE AND REACH**

### **The reach problem**

The Page solution comes with a cost. Posterity supplies the mechanisms, and each customer applies them differently. Different people have different kinds of relationships, and some will be followed more readily than others.  

The customer's people are connected to their personal profile, and those connections do not transfer. Every Page builds its followers from scratch. The old migration tool that converted friends to Page likes is gone. The current flow retains an invite step, capped to prevent spam triggers, and sources disagree on whether bulk selection survives in every surface. The honest gap is that an invite is not a follow. Most customers will have between one and three hundred friends, and Page invite acceptance runs low. Posterity assumes a fraction of their circle.

### **The template post**

Posterity writes a template post, which the customer makes their own and publishes to their personal profile while alive. Posterity writes the ask, because a customer will not know to request Favorites and notifications. The customer writes the reason for it, and that half cannot be supplied for them. It is not a form with blanks. It is the structure of an ask, and the customer writes the reason into it. They explain that they have things they want to say after they are gone, and ask those who want to hear it to add the Page to their Favorites and turn on notifications.  
The template post requires no Graph API, no administrator role, and no cooperation from Meta. It is the only mechanism in the entire architecture that requires permission from nobody, and the only one that addresses reach rather than access.

### **Why it works**

Self-selection. Favorites is one of the few ranking levers Meta still hands to the user rather than the algorithm, and the people who spend a tap on it are precisely the people the content was written for.  
The target is not a share of the friends list. It is the small group of people the content was written for, and this is the only mechanism that lets those people identify themselves.

The reason it works is that the ask is not really about a Page. It is a person telling their friends they have things they want to say after they are gone, and pointing at where those things will arrive. The Favorites tap is a byproduct of the real message. If the template ever reads as a technical instruction with feeling attached rather than the reverse, it has lost the mechanism.

One post reaches a fraction of a friends list. The post is therefore repeated rather than published once, and the six-month check-in is the existing recurring touchpoint that can carry the prompt to share the Page again. Across the years an account sits within its Planning Phase, that compounds.

### **Favorites, verified**

A person can select up to thirty people or Pages as Favorites. Their content is prioritized at the top of the main feed, and a separate Favorites feed shows only those posts. Neither friends nor Pages are notified when they are added or removed. The thirty-slot cap is the number for the customer-facing copy. It makes the ask feel considered rather than trivial.

### **Notifications as a separate ask**

Following a Page carries its own notification setting. Favorites raises priority within ranking; notifications bypass ranking altogether. For the handful of people who matter most, that is the difference between likely and certain. The template should ask for both.

### **Time is the real answer**

The best long-term answer is not a better invite mechanism. It is time. A Page built during the Horizon Phase accumulates followers and meaning across years before it is ever needed.  
This is why Page creation is deliberately ungated while the grant of control is not. It also reframes the Page as the outward-facing counterpart to the customer's second legacy, which is a better onboarding story than a technical requirement.

One consequence worth knowing when the delivery calendar is designed: the first delivered post has the weakest distribution, because a quiet Page accumulates no engagement signal. Every delivery after it reaches further, since a message from someone who is gone draws real engagement and engagement is what ranking reads. A customer who uses their Page while alive builds that signal before it is needed. This belongs in the FAQ explaining how to use the Page.

### **Template post status**

The template post is recorded here in purpose only. The copy itself is a dedicated brand pass and is not written as part of this document, and it is Brand Copy rather than Marketing. The post carries a marketing byproduct, but written for acquisition it fails at both jobs. It works because it is a person telling their friends something hard. This is the highest-leverage piece of copy in the product. Every other link in the chain can work perfectly and still deliver to nobody. It is also the least reproducible asset in the architecture, because what a competitor would have to copy is the voice rather than the instruction.  
It doubles as an acquisition channel. Every one of those posts is a real person, in their own words, explaining Posterity to a friends list of exactly the right demographic — credibility that cannot be bought.

# **INSTAGRAM**

### **Tabled**

Instagram is not included at launch. Facebook Pages is the only social platform in the initial build.

### **The previously stated reason was wrong**

Instagram was tabled over video length, recorded as roughly sixty to ninety seconds with a file size cap. That is not a publishing limit. The publishing API accepts videos from three seconds to fifteen minutes. The ninety-second figure governs eligibility to surface in the Reels tab, which is a discovery threshold rather than a ceiling. A video that falls outside the Reels eligibility window publishes as a standard video post instead — which is what Posterity wants, since the audience is the customer’s own followers rather than strangers.  
It is the same shape as the Facebook ninety-second figure: a classification rule mistaken for a limit. Posterity's own upload limits are held in the context under Video and Image Storage and Compression, and no platform figure sets them.

### **Access is inherited**

An Instagram Business account connects through a Facebook Page. Since Posterity already holds administrator control of the Page, Instagram access would arrive as a byproduct of the existing architecture with no additional customer task.

### **The real reason it stays tabled**

A Facebook Page is a separate object from the customer’s profile, which is why it survives memorialization. An Instagram Business account is not — it remains the customer’s own account with a business layer applied on top. Instagram memorializes accounts too. Whether an Instagram Business account inherits the Page's protection is undocumented. Meta publishes memorialization guidance for Instagram accounts generally and says nothing about the business layer or about connected Page access, so the question cannot be answered without testing it. It is the question that decides whether Instagram is a real channel or a fragile one. Beyond that, adding Instagram means a second application review cycle for its own publishing permission, and the Delivery System was designed and written without it.

### **What changes in the content review clause if Instagram is added**

The approved content review clause names Meta’s Community Standards only, which is correct while Facebook Pages is the sole platform. Instagram is governed by its own Community Guidelines rather than by the Facebook standards. If Instagram is ever added, the clause has to name both — Meta’s Community Standards for Facebook, and Instagram’s Community Guidelines for Instagram.

# **LOGGING**

Five categories of record are logged across social media delivery and Page custody. These are Supabase entries either way, so the cost is near zero. The ones that earn their place answer a question someone will actually ask years later.

The principle is not confined to social media. The same rule applies wherever a customer interaction will need to be evidenced later. What is logged is events rather than activity, filed by account and by section. The five categories below are the social media and Page custody set.

### **Setup elections**

Path chosen, co-administrators named and in what order, timestamps, and any later changes. Setup also captures the customer’s acknowledgement of what happens if no co-administrator accepts. That acknowledgement is what makes the record evidence of informed intent, and it is the most important of the five.

### **Access grants**

When Posterity was granted full control, when each co-administrator accepted partial control, and every verification result. Answers whether the customer completed what they agreed to.

### **Delivery outcomes**

Attempted, published, refused and on what grounds, and where rerouted. Required regardless for the obligation-discharged-on-arrival position.

### **Handoff cascade**

Every contact attempt, every recipient, and every response. This is the record showing that Posterity met its stated schedule before deleting a Page.

### **Staff actions**

Reviewer, decision, and grounds for every social media delivery review, plus the existing Post Manually override log. The Operational Dashboard task fields already capture most of this.

### **Retention**

A retention rule is needed rather than indefinite retention by default. A record spanning five to ten years of who received what, containing the customer’s private content decisions, is itself sensitive. This belongs in the legal package.

# **GATE SEQUENCE**

The gates in firing order. Each has a condition, a thing it blocks, and a home. The last is a terminal state and carries only a home.

### **1\. Plan initiation**

Condition: at least one plan initiated within the account. Blocks: authorization for social media access. Lives in: User Profiles and this document.

### **2\. Page verification**

Condition: Posterity holds full control and, where the customer elected the transfer path, at least one co-administrator has accepted partial control. Blocks: social media appearing as a delivery method. Lives in: this document. Programmatic, checked once at setup.

### **3\. Detection at upload**

Condition: content passes nudity detection, and social media content additionally passes Community Standards detection. Blocks: non-compliant content entering the system. Lives in: The Content Builder. Advisory rather than blocking until the detection system is tested and verified.

### **4\. The Social Gate**

Condition: a Master Recipient exists account-wide, or the entry carries an Alternative Recipient sequence. Blocks: a social media entry being committed without a route off the platform. Lives in: The Delivery System.

### **5\. Staff review at delivery**

Condition: staff approval prior to posting. Blocks: refused content publishing. Refused content routes through the entry’s Alternative Recipient sequence, or to the Master Recipient where no sequence exists. Lives in: this document and the Content Builder.

### **6\. Handoff acceptance**

Condition: a co-administrator accepts transfer of ownership. Blocks: promotion to full control and Posterity’s removal, until an acceptance is recorded. Lives in: Reprise Phase Page Sequences.

### **7\. Posterity Phase entry**

Terminal.  A Page in the transfer cascade that no co-administrator accepts is deleted on January 1st following the final notification. A Page elected for deletion with the account ends at the Posterity Transition, and a Page elected for deletion after all account deliveries are finished ends earlier, at the start of the first Reprise year. The Page ends in every case, by transfer or by deletion. The account has its own terminal point and does not share this one — a storage fee paid for the year ahead keeps the account in its Reprise Phase, and where none is paid the account is deleted and its legacy enters the Posterity Phase. 

*The first two are access gates and sit outside the Delivery System. The third is a routing gate and sits inside it. The fourth and fifth are content gates. The last two are custody gates.*

# **THE RETIRED ARCHITECTURE**

### **The three false assumptions**

The prior social media architecture rested on three assumptions. Each was checked directly, and each failed.

* That Posterity staff could log into customer accounts after activation using stored backup credentials.  
* That personal Facebook profiles could be posted to programmatically.  
* That a ninety-second video ceiling was a hard platform limit to design around.

### **Personal profiles are permanently closed**

The publishing route to personal profiles was removed in 2018, when Meta deprecated publish\_actions in Graph API version 3.0 following Cambridge Analytica. Every publishing operation now targets a Page.  
This is a platform-level restriction rather than a permissions problem. No approval tier overcomes it, and no application review resolves it. The route is closed for everyone, permanently.

### **Memorialization closes the credential route**

Facebook memorialization permanently locks a personal profile. Once memorialized, nobody can log in — not family, not a legacy contact, not anyone holding the password. The parameters that matter to Posterity are these. Memorialization is never automatic; it must be requested. Any Facebook user can submit the request, and the relationship to the deceased is self-declared on the form, which makes it a soft gate rather than a real one. Proof of death is required, but an obituary link satisfies it. There is no deadline — the request can be made the week of the funeral or two years later. It is irreversible, and only deletion follows it.  
Deletion, by contrast, is genuinely gated. It requires proof of authority such as a will, power of attorney, or estate letter, and can only be requested by a verified immediate family member or executor. Memorialization is the easy path and the likely one.

This is what makes a credential-based system unworkable rather than merely risky. Posterity’s delivery obligation runs five years minimum from an account entering its Active Phase, and often longer. Across that span the exposure never closes. A single form, submitted by any Facebook user, for reasons entirely unconnected to Posterity — a birthday reminder that hurt someone, a relative tidying up — ends access permanently and without notice.

### **Credentials were a terms breach regardless**

Independent of whether the approach worked, it was never permitted. Meta's Terms of Service require that a person not share their password, give access to their Facebook account to others, or transfer their account to anyone else without Meta's permission. The terms do not carve out an exception for death, and reporting on memorialization states the position plainly: a person who knows another user's login information is still prohibited from logging into that account, including after death.

The credential model failed twice over. It would have broken on its own, and it was not allowed in the first place.

### **The ninety-second ceiling was a classification rule**

The ninety-second figure is a constraint of the Reels endpoint rather than a limit on Facebook video. Publishing through the standard Page video endpoint never reaches the Reels endpoint, so the figure never applies. It was a classification rule mistaken for a limit.

### **Why nothing is hiding**

Every alternative route was checked and closed before the Page architecture was adopted.

* Graph API to profiles — removed in 2018, platform-wide.  
* Professional Mode — makes a profile followable and converts existing connections to followers, but grants no administrator role, no Graph API access, and remains memorializable. Third-party tools cannot connect to it at all.  
* Groups API — deprecated April 2024\. Publishing to Groups was removed from all versions, and no third-party tool can post to a Group regardless of partnership status.  
* Groups, posted manually — works technically but fails on attribution. A Group post visibly comes from whoever published it, so a farewell message would arrive from a Posterity staff account rather than from the customer.  
* Stored credentials — a terms breach, and dies at memorialization regardless.  
* Browser automation — the same breach, carrying the shared-environment exposure recorded under Risk and Enforcement.

The pattern is consistent. Meta removed profile posting in 2018 following Cambridge Analytica, removed Groups publishing in 2024, and memorialization locks a profile against any login. Every route out was enumerated, and each one closes on its own grounds.  
