# PilotPathway.ai — Flight Training Platform

## What this is

Adaptive AI Private Pilot ground school for underserved students — Black, Latino, first-generation, low-income youth, roughly ages 16–26. Digital evolution of the Fly Compton Foundation. Part 141-style structure.

Human CFIs still do all real flight instruction and endorsements. The AI ("Captain Path") is the ground instructor and progress coach.

**Founder:** Demetrius D. Harris. Not a professional coder. Windows / PowerShell. Explain decisions in plain language, not just code.

**Repo:** https://github.com/demetriusdharris-sys/pilotpathway
**Live:** https://pilotpathway.vercel.app

The existing Replit app (mentorship-hub.replit.app) is a PITCH DEMO only. Do not copy that codebase. Mentorship gets rebuilt inside this app later.

---

## Stack (locked — do not change)

- Next.js 15 App Router + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres)
- Anthropic Claude API for the tutor (`claude-sonnet-5`)
- pnpm
- Vercel hosting

If a task seems to need a library outside this list, ask before installing it.

---

## Standing engineering rules

These were learned the hard way. Do not treat them as suggestions.

**1. Verify in production, on the live deployed site, before saying anything is done.**
A green build, passing lint, passing typecheck, and working localhost have now failed to predict production behavior twice. "It builds" is not evidence. "I tested it on localhost" is not evidence. Deploy it, use it on the real URL, then report.

**2. One variable per deploy.**
Never bundle two features into one push. When something breaks, you must be able to name the cause without guessing.

**3. Read the logs. Do not theorize.**
Every significant bug in this project was solved by opening a log that nobody had opened yet, and every wrong turn came from reasoning about probable causes instead. Supabase Auth Logs, Postgres Logs, and Vercel Runtime Logs each contain the actual error text. Get the full JSON entry, not a summary.

**4. Do not claim a fix is verified unless you ran the failing scenario and watched it pass.**
Report before/after numbers, actual log lines, real values — not "should now work."

**5. Never push when production is serving a rolled-back deployment.**
Vercel can serve an older deployment than `master` contains. Check what is actually live before pushing.

---

## How to work with Demetrius

- **One command at a time.** He is on Windows PowerShell. Do not dump ten steps.
- After each step, tell him exactly what he should see.
- Use full absolute paths (`cd C:\Users\demet\pilotpathway`), never relative `cd`.
- Do not claim something is on his clipboard. Have him open the file in Notepad and copy from there — clipboard handoff has failed.
- He will approve file changes in Claude Code.
- He is the founder; you are the implementer. Ask product questions only when blocked.
- Be honest about uncertainty. He explicitly asked not to be guessed at.

---

## Environment gotchas

- **Working directory:** `C:\Users\demet\pilotpathway`. Do not nest another folder inside it.
- **PKCE requires the same browser.** Auth confirmation links contain a `pkce_` token tied to browser storage from the signup session. Opening the link in a different browser fails with "link did not work." This is a known open product bug (see below).
- **Email:** Resend SMTP, sending from `noreply@pilotpathway.ai`. Domain verified in Resend with DKIM + SPF + MX records in GoDaddy. Supabase Site URL must be `https://pilotpathway.vercel.app` (no trailing slash) or confirmation links break.
- **GoDaddy DNS:** the Name field must exclude the domain. `resend._domainkey`, not `resend._domainkey.pilotpathway.ai`.
- **Middleware:** must not run on non-GET requests. `NextResponse.next({ request })` clones the request body and hangs on Server Action POSTs, causing `MIDDLEWARE_INVOCATION_TIMEOUT`. Login and signup are the only Server Actions in the app.
- **Supabase SQL Editor wraps a multi-statement paste in a single transaction.** A failure partway through rolls the whole paste back, so there is no partial state to clean up — but also no partial progress. Fix the statement that failed and re-run the entire migration.

---

## Conventions

- Server Components by default. `"use client"` only when needed.
- Named exports except `page.tsx` and `layout.tsx`.
- No `any`. Use `unknown` with narrowing. This rule currently holds at zero violations — keep it that way.
- Never use `localStorage` or `sessionStorage`.
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never `NEXT_PUBLIC_`. Never in a client component.
- New migrations only. Never edit an existing migration file.
- **Profile write allowlist.** Client writes to `public.profiles` are restricted by column `GRANT` to `email`, `display_name`, `first_name`, `date_of_birth`, `updated_at`. Anything else returns `42501`. RLS restricts rows, not columns — the grant is what stops a student setting their own `role` to `admin`.
- **Migration ordering.** `LANGUAGE sql` functions are name-resolved at creation time, unlike `LANGUAGE plpgsql`. Tables must be created before any `language sql` function that references them. This caused a failed apply on `0006`.

---

## Product rules

- **Target student:** 16–26, first-generation, cost-sensitive, new to airports, carrying real doubts about money and belonging.
- **FAA standards stay exact.** Cultural adaptation lives in examples, tone, mentors, and belonging — never in lowered standards.
- **Voice:** encouraging, professional, precise. Not corporate. Not slang-heavy. Never speak as if from their neighborhood.
- Free core ground school. Progress must be visible.
- Build for cheap phones and limited data.

### AI tutor rules

- Captain Path lives in `src/lib/tutor.ts` and `src/lib/instructor/*`.
- Cite PHAK, AFH, AIM, 14 CFR, ACS-style sources.
- **Never invent regulations.** If unsure: "confirm with your CFI and the current FAA handbook."
- **ACS Areas of Operation are referenced BY NAME, never by task code.** Task codes are revision-specific and easy to get subtly wrong; a student showing a DPE a bad code pays for our mistake. Same rule for handbook chapter numbers.
- Never weaken the ACS to be "inclusive." Inclusion is examples, tone, access, and history cards — never lowered standards.
- History only from `history-cards.ts` unless a new reviewed card is added.
- Latimer.ai is a future RAG partner, not the CFI.
- Never judge solo or checkride readiness — that is the human CFI's certificate on the line.
- Short by default. End with one question. Socratic, not lecturing.
- Do not change `SYSTEM_PROMPT` text or the prompt-cache breakpoint structure without being asked.
- `claude-sonnet-5` rejects `temperature`, `top_p`, and `top_k` with a 400 — do not add them.

---

## Original sprint scope (through Aug 31, 2026) — complete

1. Student signup / login
2. Curriculum outline (Stages 1–3)
3. Stage 1 AI Flight Instructor chat
4. Basic progress tracking
5. Student dashboard
6. Deploy to Vercel

Explicitly out of scope for that sprint: VR, live flight-school booking, full mentorship hub, payments.

---

## Current state (as of Aug 31, 2026)

**Working in production:**
- Signup / login with email confirmation enforced
- Curriculum: 16 Stage 1 lessons (Stages 2 and 3 are outline labels only)
- Captain Path tutor chat with conversation memory persisted to `instructor_messages`
- `studentFirstName` and `masteryNotes` wired to real values (previously dead parameters)
- Rate limiting: 150 messages/user/day, 5000 global, configurable in `usage_limits` without a deploy
- Spend metering in `tutor_usage`
- Basic progress tracking, student dashboard, Vercel deploy

**Measured cost:** ~0.48¢ per follow-up exchange with prompt caching (down from ~1.05–1.29¢ before conversation memory was added — caching the 2,700-token system prompt saves more than history costs).

**Known open bugs:**
- PKCE same-browser requirement breaks confirmation links opened on a different device. Mobile-first audience will hit this constantly. Needs either a clearer error or a flow that works cross-device.
- `http://localhost:3100/auth/callback` still in the production redirect allow-list.
- **Guardian consent link missing.** The `consent` INSERT policy allows any authenticated user to insert a row with `granted_by_relationship = 'guardian'` for any `subject_user_id`, because no guardian-to-student link table exists yet. Until one does, guardian consent must be written by the service role only, never from the client. **This blocks onboarding students under 18.**

---

## Architectural debt (deliberate, not yet paid)

**1. Lesson content is hardcoded** in `src/lib/curriculum.ts`. Adding or editing a lesson requires a code change and a deploy. Neither the founder nor a CFI can fix a typo. This must move to the database — the product's entire value is curriculum.

**2. Progress tracking is a checkbox.** `lesson_progress` stores one three-state flag per lesson. No per-objective tracking, no mastery score. A student who clicked through everything looks identical to one who mastered it.

**Per-objective mastery is the highest-leverage item on the roadmap.** It does three jobs at once: makes lessons feel personal, makes CFI endorsements defensible, and produces the outcome reporting that renews institutional contracts.

---

## Schema pass — complete

Migrations `0005` and `0006` are applied to production and verified.

**`0005` — profiles.**
- `role`, enum `public.user_role`: `student` / `mentor` / `school_admin` / `admin`, default `'student'`. Self-assignment is blocked by column grant, not by RLS (see Conventions).
- `date_of_birth`, nullable — production already had users, so it could not be required.

**`0006` — organizations, cohorts, entitlements, milestones, consent.**
10 tables, 4 helper functions, 14 policies, RLS enabled on all ten.

| Table | Purpose |
|---|---|
| `organizations` | Districts, schools, sponsors, flight schools |
| `organization_members` | Membership and org role (`member` / `staff` / `org_admin`) |
| `cohorts` | Named groups within an organization |
| `cohort_members` | Join table — a student can be in a school cohort and a sponsor cohort at once |
| `entitlements` | Who is funding this student's access, and until when |
| `milestone_types` | Seeded lookup: discovery flight, medical, written test, first solo, checkride |
| `milestones` | The real-world journey, most of which happens outside the app |
| `milestone_contributors` | Attribution — which mentor, school, or sponsor contributed |
| `consent_scopes` | Seeded lookup of what can be shared |
| `consent` | Per-student, specific, revocable control over what is shared and with whom |

### Locked design decisions

These are settled. Do not relitigate them without a reason.

- **Entitlements may overlap.** A district and a sponsor can fund the same student concurrently. Access is "any active row" — not a single current plan.
- **Milestones are student-self-reported and staff-confirmed.** `created_by` is recorded to support a staff-proposal flow later without a schema change.
- **Nobody can confirm their own milestone.** The staff-confirm policy excludes `auth.uid()`, because `shares_org_with` self-joins `organization_members` and would otherwise let staff who are also enrolled students confirm themselves.
- **Consent is append-only.** Revocation inserts a new row. There are deliberately no `UPDATE` and no `DELETE` policies on `consent` — history is never rewritten.
- **Guardian consent expires at the subject's 18th birthday**, and the student re-grants as an adult. `re_consent_due_at` exists so they are prompted ahead of the birthday rather than blocked mid-session.

**Rules for the milestone system:**
- Verification status is required (self-reported vs confirmed). Unverified data in a sponsor report is a trust event you don't recover from.
- No mentor leaderboard. It turns a supportive community competitive and punishes whoever took the hardest student.
- Aggregate reporting by default. No individual identifiable unless they opted in.
- "Real time" is the wrong target. Daily refresh is enough; these milestones happen months apart.

---

## Business decisions (context for product work)

**Revenue model:** the AI ground school is free permanently. Revenue comes primarily from institutions and employers, not from students — our users are cost-sensitive by definition.

**Two focus streams:** school/district licensing, and the CFI marketplace (group ground school, up to 10 students per session).

**Four pricing rules, non-negotiable:**
1. Never paywall safety content.
2. Pay-per-use, never subscription. Prepaid credits that never expire.
3. Students can earn paid access through demonstrated mastery.
4. Cross-subsidize openly — display the free-seat count funded by each partner.

**Competitive positioning:** AOPA gives away a free four-year high school aviation curriculum in ~400 schools. Do not sell districts a curriculum. Sell the adaptive layer on top — AI tutor, per-student mastery data, teacher dashboard, live CFI sessions.

**Youth safety is the highest-severity risk in the company.** Minors in live video sessions with adults requires verified parental consent, recorded and retained sessions, no unrecorded one-on-one adult-minor contact, and background checks beyond FAA requirements. The FAA vets a CFI's flying, not their fitness to work with children.

**Institutional sales blockers** (engineering work, not paperwork): signed SDPC National Data Privacy Agreement, FERPA, California SOPIPA/AB 1584, COPPA age gate, WCAG 2.1 AA conformance plus a VPAT.

---

## Commands

```
pnpm dev
pnpm build
pnpm lint
pnpm exec tsc --noEmit
```
