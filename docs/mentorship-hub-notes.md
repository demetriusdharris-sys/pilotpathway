# Mentorship hub — what the demo says, and what it implies

Notes from reading `mentorship-hub.replit.app` on Sep 24 2026. **That demo is a pitch artefact — its own banner says "Demo Mode … All data is simulated" — and its code must not be copied** (see CLAUDE.md). This file records what it says the product *is*, so the build starts from intent rather than from a reading of somebody's React.

## What it actually is

**Classroom visits, not one-to-one mentorship.** A school asks for a speaker; a working pilot volunteers; the visit happens in a classroom with the teacher present; sponsors see the impact.

This matters more than it sounds. **Students do not have accounts in this product.** There is no chat, no video, no pairing, no unsupervised contact — a teacher hosts, and students are counted in aggregate. The youth-safety surface is therefore background checks and school supervision, which are policy and process, not software. The heavy consent machinery this repo already has for live sessions is a different feature.

## Four roles the demo names

| Role | Demo wording | Does it exist in our schema today? |
|---|---|---|
| Schools | "K-12 educator. Bring working aviators into your classroom." | Partly — `organizations` + `organization_members` with `staff` |
| Pilot Mentor | "Working aviator. Volunteer with classrooms in your area." | **No.** No mentor profile, no verification record, no geography |
| Organizations | "Airline · sponsor · industry partner. Sponsor events, live analytics, quarterly reports." | Partly — `organizations`, `entitlements` |
| Administrator | "Program manager. Manage events, verify mentors, monitor outcomes, export sponsor-ready data. Internal staff only." | Partly — `role = 'admin'`, `/admin` |

## What the existing schema already gives us

More than half of it, and this is the argument for building inside this repo rather than beside it:

- `organizations` already covers districts, schools, sponsors and flight schools, with `organization_members` and org roles.
- `entitlements` already answers "who is funding this, and until when", and overlapping funders are already a supported case.
- **`milestones` is the shape a classroom event wants.** It is already self-reported and staff-confirmed, `created_by` is recorded, **nobody can confirm their own**, and `milestone_contributors` already attributes a milestone to a mentor, a school *or* an organisation. A visit is a milestone with contributors.
- Consent scopes already include `sponsor_milestones`, and aggregate-by-default reporting is already a locked rule.

## What is genuinely new

1. **A classroom request** — grade level, subject, date window, location, how many students.
2. **A mentor profile** — what they fly, where they are, how far they will travel, and a **verification record** (background check, date, who checked, expiry). The demo says "verified Pilot Mentors"; verification is the product's core promise to a school.
3. **Matching** — the demo says "get matched" and "one click to confirm", which implies a suggestion, not a marketplace search.
4. **An event** — a confirmed visit: when it happened, who attended, hours given.
5. **Sponsor reporting** — quarterly, aggregate.

## What it is FOR — decided by the founder, Sep 24 2026

**The hub is how students get into the ground school.** A pilot speaks at a school or an organisation's event; the students in that room who are interested sign up; they get the free ground school, which prepares them for the written test and eventually for a checkride with a human CFI.

That is not a detail. It decides what to build first and what the schema has to carry:

- **The load-bearing object is the handoff from an event to a signup.** Arranging a pilot to visit a school can be done by email today. What cannot be done today is capturing the students who were in the room. So the smallest useful version of this hub is *event → attribution → signup*, and matching, analytics and leaderboards come after.
- **Attribution is the business case.** "Your funded visit produced 14 signups, 9 of whom finished Stage 1" is the sentence a sponsor renews on, and it is the only sentence that connects a dollar to an outcome. Nothing in the app can produce it today.
- **A per-event code or link is the mechanism**, not a school-level one. The event is the unit a sponsor funds and the unit a pilot did the work for, and a code on a slide in the room is what actually happens in a classroom. It has to work on a cheap phone with no app.

### Two lines that must not be crossed

**1. An event code must never be required to sign up.** The core ground school is free to everyone, permanently. If a code is what unlocks access, the funnel has quietly become a paywall and the rule is broken. The code records where someone came from; signing up without one stays completely normal.

**2. Attribution is not consent.** Entering a code at signup tells us which event reached that student. It must **not** give that school's staff visibility of their progress. That is the `school_progress` scope, granted by the student or their guardian, revocable, and naming the organisation — `0021` exists precisely because that gate was once too loose. A funnel that silently turns a classroom visit into staff surveillance of a minor is the wrong product, and it is the easy mistake to make here because the data is right there.

Sponsors see aggregate only, which is already a locked rule.

### What this does to the age question

The demo says K-12. Signup is gated at 13+ and the target student is 16–26, so **the yield from a visit is the older part of that room, and the guardian flow stops being an edge case** — it becomes the main path for a large share of signups. Today a guardian invite is optional and student-initiated. If most signups are 14- to 17-year-olds who just met a pilot, that flow needs to be the obvious one rather than something on a profile page.

This is a question for the lawyer alongside the two already open, and it is more urgent than it looked: it is no longer hypothetical that minors arrive in bulk from schools.

## Three decisions that are yours, not mine

**1. The leaderboard is out — settled Sep 24 2026.** The demo has an "Impact Leaderboard" with points; CLAUDE.md says *"No mentor leaderboard. It turns a supportive community competitive and punishes whoever took the hardest student."* **The founder chose the rule: a record of what each pilot has done, no ranking.**

So: a mentor sees their own visits, hours, and the schools they went to, and can show it on a professional record. No ordering, no points, no comparison to other mentors. The demo's leaderboard page does not get rebuilt.

**2. "Students inspired" as a counted metric needs a source.** If a mentor enters it, it is unverified data heading into a sponsor report, which your own milestone rules forbid: *"Unverified data in a sponsor report is a trust event you don't recover from."* The existing pattern fits exactly — the mentor reports the visit, the teacher confirms it, and a sponsor report distinguishes the two.

**3. The "Trusted by" logos.** The home page shows Delta, United, American, JetBlue, OBAP, WAI and Sisters of the Skies under "TRUSTED BY AVIATION ORGANIZATIONS". If those are not existing partners, that section implies endorsements that do not exist — the kind of thing a funder's counsel notices, and not something I will reproduce in the real product without partnerships behind it. Sponsor logos are fine once a sponsor is real.

## One thing to fix before any of this lands

**The `mentor` role is already taken.** `may_review_content()` grants quiz-card and practice-question approval to anyone whose `profiles.role` is `mentor` — that is how CFIs review content. If a Pilot Mentor is given that role, every volunteer silently gains the power to approve safety content. A small migration separating "content reviewer" from "pilot mentor" has to come first.

## Sequencing

This is behind the beta blockers — a CFI, the lawyer, Equity Engine, and the beta's scope. It is also behind them for a product reason: the hub's purpose is to bring students into the ground school, and a student who arrives before a CFI has approved anything finds no quiz, no practice test and no visible progress. **Filling the front door before the building is ready wastes the visit**, and a classroom you have already spoken to is hard to go back to.

The build order that follows from that:

1. A CFI approves content, so an arriving student finds a working ground school.
2. **Event → attribution → signup.** The smallest hub that does the one thing email cannot.
3. A mentor's own record of what they have done, and verification status for schools.
4. Classroom requests and matching — worth automating once there are more visits than can be arranged by hand.
5. Sponsor reporting, aggregate, built on the attribution from step 2.
