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

## Three decisions that are yours, not mine

**1. The leaderboard contradicts a locked rule in CLAUDE.md.** The demo has an "Impact Leaderboard — recognizing the pilots who go above and beyond", with points. The business rules in CLAUDE.md say, in as many words: *"No mentor leaderboard. It turns a supportive community competitive and punishes whoever took the hardest student."*

The reasoning transfers. A leaderboard rewards the pilot who does eight easy visits near home over the one who drives three hours to a rural school, and it makes a volunteer's contribution a ranking. If you want recognition without a ranking, there are versions that do not pit mentors against each other — a record of what someone has done, visible to them and on their professional record, with no ordering. **Say which you want; I am not going to quietly build either one.**

**2. "Students inspired" as a counted metric needs a source.** If a mentor enters it, it is unverified data heading into a sponsor report, which your own milestone rules forbid: *"Unverified data in a sponsor report is a trust event you don't recover from."* The existing pattern fits exactly — the mentor reports the visit, the teacher confirms it, and a sponsor report distinguishes the two.

**3. The "Trusted by" logos.** The home page shows Delta, United, American, JetBlue, OBAP, WAI and Sisters of the Skies under "TRUSTED BY AVIATION ORGANIZATIONS". If those are not existing partners, that section implies endorsements that do not exist — the kind of thing a funder's counsel notices, and not something I will reproduce in the real product without partnerships behind it. Sponsor logos are fine once a sponsor is real.

## One thing to fix before any of this lands

**The `mentor` role is already taken.** `may_review_content()` grants quiz-card and practice-question approval to anyone whose `profiles.role` is `mentor` — that is how CFIs review content. If a Pilot Mentor is given that role, every volunteer silently gains the power to approve safety content. A small migration separating "content reviewer" from "pilot mentor" has to come first.

## Sequencing

This is behind the beta blockers — a CFI, the lawyer, Equity Engine, and the beta's scope. It is also behind them for a product reason: the mentorship hub sells to schools and sponsors, and the strongest thing to sell them is outcome data from the ground school, which does not exist until a CFI approves content.
