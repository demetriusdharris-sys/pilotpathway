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
- **Signup confirmation no longer uses PKCE, and must not go back to it.** `{{ .ConfirmationURL }}` produces a PKCE link whose `code_verifier` lives in the browser that started the signup, so opening it on another device fails with "link did not work" — fatal for a mobile-first audience. The Confirm signup template now uses `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email`, which carries the token in the URL and needs nothing stored locally. Verified Sep 15 2026 by signing up on a phone and confirming on a desktop. Both templates are recorded in `docs/auth-email-templates.md`; Supabase is the only other copy. PKCE still applies to any template left on `{{ .ConfirmationURL }}` — a password reset flow, if one is ever added, needs the same treatment.
- **`signUp` appends `?next=` to `emailRedirectTo` unconditionally, and that is load-bearing.** It guarantees `{{ .RedirectTo }}` already carries a query string, so the email template can append `&token_hash=...` and produce a valid URL. Make that append conditional and every confirmation link becomes `https://.../auth/callback&token_hash=...` — malformed, and nobody can confirm an account. Change the template in the same breath or not at all.
- **Email:** Resend SMTP, sending from `noreply@pilotpathway.ai`. Domain verified in Resend with DKIM + SPF + MX records in GoDaddy. Supabase Site URL must be `https://pilotpathway.vercel.app` (no trailing slash) or confirmation links break.
- **GoDaddy DNS:** the Name field must exclude the domain. `resend._domainkey`, not `resend._domainkey.pilotpathway.ai`.
- **Middleware:** must not run on non-GET requests. `NextResponse.next({ request })` clones the request body and hangs on Server Action POSTs, causing `MIDDLEWARE_INVOCATION_TIMEOUT`. Login and signup are the only Server Actions in the app.
- **Supabase SQL Editor wraps a multi-statement paste in a single transaction.** A failure partway through rolls the whole paste back, so there is no partial state to clean up — but also no partial progress. Fix the statement that failed and re-run the entire migration.
- **`0010` is written for the Supabase SQL Editor specifically.** Because the editor supplies the transaction, an explicit `begin;`/`commit;` inside the file conflicts with that wrapper and caused the temp table to drop early. The file therefore opens no transaction of its own and drops its temp table explicitly. Run through `psql` it would not be atomic: each statement would autocommit, so the refusal check would fire after the writes had already landed.
- **The founder runs git commands in a separate PowerShell window**, at the direction of a chat session. `origin/master` moving forward without Claude Code having pushed is expected and normal. This has been misdiagnosed as an automatic push three times — check this note before reporting it as an anomaly again.
- **A commit message is not a record of apply state.** Migration commits say "(not yet applied)" because that was true when the file was written; they are never amended once the migration is applied. **As of Sep 16 2026, every migration `0001` through `0017` is applied to production and verified.** Do not infer from a commit message that a migration is pending — ask, or check the database.
- **Secrets are not visible from the repo, and their absence there means nothing.** `.env.local` is gitignored and Vercel environment variables live in Vercel, not on disk. `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are all set in both. Do not conclude a key is missing because grep did not find it.
- **`pnpm lint` and `pnpm exec tsc --noEmit` do not catch Next's Server Action export rules.** A `"use server"` module may only export async functions; exporting a sync helper from one passes both checks and then fails `pnpm build`. Run the build whenever you touch a `"use server"` file.
- **Column-level grants and RLS policies interact, and nothing but the live database will tell you.** When a table hides columns with `GRANT SELECT (...)`, every column an RLS policy reads must also be granted to the role running the query — above all when a policy on one table checks another table in a subquery. `0014` granted `quiz_cards` without `status`; the `quiz_card_options` policy checks `status` in a subquery, so every student read of the options failed with `42501` and the quiz silently rendered nothing. Lint, typecheck, and the build all passed. **The Postgres hint on that error suggests `GRANT SELECT ON <table>` — never follow it on a table that uses column grants to hide data.** It grants every column, including the ones being hidden. Grant the single column the policy needs, as `0016` did.

---

## Conventions

- Server Components by default. `"use client"` only when needed.
- Named exports except `page.tsx` and `layout.tsx`.
- No `any`. Use `unknown` with narrowing. This rule currently holds at zero violations — keep it that way.
- Never use `localStorage` or `sessionStorage`.
- **Gold text on a light background is `text-gold-strong`, never `text-gold`.** `--gold` is 2.09:1 on white and fails WCAG AA for text of any size; `--gold-strong` is 5.11:1. `text-gold` is correct only on navy (7.45:1), and `bg-gold` with `text-gold-foreground` is correct for buttons. Decorative glyphs marked `aria-hidden` are exempt.
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

## Current state (as of Sep 15, 2026)

**Working in production:**
- Signup / login with email confirmation enforced
- Email confirmation works across devices — sign up on a phone, confirm on a desktop. Verified on the live site Sep 15 2026.
- A signup error keeps the student's first name, email, and date of birth; only the password clears. The inputs in `auth-form.tsx` are controlled on purpose, because React 19 wipes uncontrolled fields when a form action finishes — do not convert them back. Verified on the live site Sep 16 2026 with a too-short password.
- Dashboard prompt for students with no date of birth on file, linking to `/profile`; it disappears once a date is saved, and stays hidden if the profile read fails. Verified on the live site Sep 16 2026 with an account lacking a date of birth and one that had it.
- Accessibility pass toward WCAG 2.1 AA (Sep 16 2026). **Colour contrast verified on the live site:** gold text on white measured 2.09:1 and failed; it now uses `text-gold-strong` at 5.11:1. **Built but not yet heard on the live site with a screen reader:** tutor replies are announced once complete through a polite live region, the typing cursor is hidden from screen readers, student chat messages are labelled "You:", and each quiz question is the legend of its option group. Skip links were judged unnecessary — every page has a `<main>` landmark and headers are two or three links. Not covered: touch target size (a WCAG 2.2 criterion, not 2.1 AA; buttons are 32px) and any formal audit or VPAT.
- Signup collects date of birth behind a 13+ age gate, validated server-side in the Server Action before Supabase is called. Verified on the live site.
- `date_of_birth` carried through signup metadata into `profiles`. Verified on the live site.
- Student profile page at `/profile`: first name, and a write-once date of birth for accounts that never had one. Verified on the live site.
- Guardian invite flow, end to end — invite route issuing hashed single-use tokens, Resend email, redemption page, and guardian status on the profile page. Verified on the live site.
- `next` preserved through email confirmation, so a guardian who signs up to accept an invite returns to that invite instead of a bare dashboard. Verified on the live site.
- Quiz cards on the lesson page, graded server-side, each answer written to `objective_assessments`. Confirmed by the founder on the live site Sep 15 2026 using one temporarily approved card, since reverted to draft. Students see no quiz until a CFI approves cards — see Known open bugs.
- Curriculum: 16 Stage 1 lessons (Stages 2 and 3 are outline labels only)
- Captain Path tutor chat with conversation memory persisted to `instructor_messages`
- `studentFirstName` and `masteryNotes` wired to real values (previously dead parameters)
- Rate limiting: 150 messages/user/day, 5000 global, configurable in `usage_limits` without a deploy
- Spend metering in `tutor_usage`
- Basic progress tracking, student dashboard, Vercel deploy

**Measured cost:** ~0.48¢ per follow-up exchange with prompt caching (down from ~1.05–1.29¢ before conversation memory was added — caching the 2,700-token system prompt saves more than history costs).

**Objective-signal judge cost:** the Claude Haiku 4.5 call that reads each exchange for per-objective signals adds **~0.05–0.10¢ per exchange** — measured from Vercel runtime logs Sep 16 2026: 0.0546¢ when it found no signal, 0.0979¢ when it found one. That is roughly 11–20% on top of the tutor call, so a full exchange costs ~0.54–0.58¢. It is logged as `Objective signal call:` with a `costCents` field and deliberately **not** written to `tutor_usage`, because it is our inference cost, not the student's usage. Vercel runtime logs are retained only briefly — to re-measure, send a tutor message and search `costCents` within minutes. **The judge is skipped on the canned starter prompts**, which carry no evidence of what the student knows, and logs `Objective signal call skipped: starter prompt` instead. The starters are defined once in `src/lib/tutor-starters.ts`, used by both the lesson page and the route, and recognised on the server by exact text — keep it the single definition, or editing a starter's wording silently re-enables the paid call. Verified on the live site Sep 16 2026: a starter logged the skip with no `costCents`, a typed question logged a normal call.

**Known open bugs:**
- `http://localhost:3100/auth/callback` still in the production redirect allow-list.
- **A guardian deleting or downloading a minor's account leaves only a short-lived trace.** It is logged (`Guardian deleted student account:` / `Guardian data export:`) with the guardian id, student id, and verification method, but Vercel runtime logs are retained only briefly. A third party acting on a minor's data should have a permanent audit record, which needs a new table. Do this before real guardian use.
- **No quiz card is approved, so no student sees a quiz and `objective_mastery` — the only reportable stream — is still empty.** The machinery is built and verified; the blocker is a CFI reviewing the 18 drafted cards in `docs/cards/`. That is a person, not engineering, and it is the single biggest thing between this product and outcome data for a school.
- Losing the `0013` race returns a 500 `write_failed` rather than a message saying an invite was just created. No duplicate is made — the index does its job — but the error is unhelpful to whoever hit it.

---

## Architectural debt (deliberate, not yet paid)

**1. Lesson content is hardcoded** in `src/lib/curriculum.ts`. Adding or editing a lesson requires a code change and a deploy. Neither the founder nor a CFI can fix a typo. This must move to the database — the product's entire value is curriculum.

**2. Progress tracking is a checkbox.** `lesson_progress` stores one three-state flag per lesson. No per-objective tracking, no mastery score. A student who clicked through everything looks identical to one who mastered it.

**3. Every existing production account has a null `date_of_birth`.** `0005` made the column nullable because production already had users. `is_adult()` fails closed, so no current user can self-grant `live_session` consent until date of birth is backfilled. This is correct safety behavior, not a bug — but it becomes a real constraint the moment live sessions are built, and the backfill is a prerequisite for that work, not an afterthought. **Partly paid, Sep 16 2026:** the dashboard now prompts any student with no date of birth to add one on `/profile`, so the backfill happens as students log in. It is not complete until every active account has logged in once — check with `select count(*) from public.profiles where date_of_birth is null` before building anything that depends on it.

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
- **Consent grants are never deleted or rewritten.** There are deliberately no `UPDATE` and no `DELETE` policies on `consent`. **Revocation sets `revoked_at` and `revocation_reason` on the grant row itself** — `has_active_consent()` treats a grant as active until that row's `revoked_at` is set, so a separate "revocation row" would deactivate nothing. (This bullet originally said revocation inserts a new row; the function never worked that way, and `0017` corrected the table comment to match.)
- **Guardian consent expires at the subject's 18th birthday**, and the student re-grants as an adult. `re_consent_due_at` exists so they are prompted ahead of the birthday rather than blocked mid-session.

**Rules for the milestone system:**
- Verification status is required (self-reported vs confirmed). Unverified data in a sponsor report is a trust event you don't recover from.
- No mentor leaderboard. It turns a supportive community competitive and punishes whoever took the hardest student.
- Aggregate reporting by default. No individual identifiable unless they opted in.
- "Real time" is the wrong target. Daily refresh is enough; these milestones happen months apart.

---

## Guardian links and tiered consent — `0007`

Closes the guardian consent gap: the old `consent` INSERT policy let any authenticated user insert a `guardian` row for any `subject_user_id`. All four boundary cases were verified against production.

**`guardian_links`** — relational guardianship. "Is a guardian" is not a useful fact; "is guardian of this student" is. Same reasoning that put org roles in `organization_members` rather than on `profiles`.

- `guardian_user_id` is **nullable**, because an invite exists before the guardian has an account. `invited_email` carries the pending case.
- `verification_method`: `email_invite` / `school_roster` / `staff_manual`.
- Check constraints make bad states unrepresentable rather than merely discouraged: a `verified` row must have both an account and a `verified_at`, a guardian cannot be the student, and every row must identify a guardian one way or the other.

**Three helper functions:**

| Function | Answers |
|---|---|
| `is_verified_guardian_of(student)` | Is the caller a verified guardian of this student? |
| `is_strongly_verified_guardian_of(student)` | Same, but only `school_roster` or `staff_manual` |
| `is_adult(subject)` | Is this person 18 or older, by date of birth? |

**Replaced consent INSERT policy** — `"Grant consent for yourself"` is dropped and replaced by `"Grant consent as self or verified guardian"`.

### Locked design decisions

- **`guardian_links` is client-readable only.** Every write goes through a server route using the service role. Verification is the entire security property here, and it belongs in code that can be written and reviewed carefully — not in a policy expression.
- **Consent verification is tiered.** `email_invite` is sufficient for `school_progress` and `sponsor_milestones`. `live_session` requires `school_roster` or `staff_manual`, because clicking a link proves control of a mailbox, not guardianship — a student with a second email address satisfies it.
- **`is_adult()` fails closed on a null `date_of_birth`.** Unknown age is treated as a minor, so self-granting `live_session` requires a date of birth on file. Erring toward "minor" is the only safe direction when the subject may be a child.

---

## Migrations `0008`–`0010`

**`0008` — date of birth reaches `profiles`.** Replaces `handle_new_user` so it carries `date_of_birth` out of `raw_user_meta_data`. The cast is deliberately defensive: a malformed or implausible value yields null rather than raising. This trigger is `SECURITY DEFINER` on `auth.users`, so a raise would abort the entire signup transaction and the student would see a generic failure with nothing to act on. Null fails closed anyway, since `is_adult()` treats unknown age as a minor. Verified by signing up on the live site.

**`0009` — per-objective mastery.** Adds `learning_objectives`, `objective_signals`, `objective_assessments`, and the `objective_mastery` view.

**`0010` — objective sync.** Loads the 48 objectives from `src/lib/curriculum.ts` into `learning_objectives`. Generated, not hand-written: regenerate it from `curriculum.ts` rather than editing it, because a hand edit is how the ids in the two files drift apart. It is safe to re-run, and it refuses to run if it would retire an objective that already has mastery data.

### Locked design decisions

- **Two evidence streams, with a structural wall between them.** `objective_signals` is AI-inferred from conversation and drives adaptive tutoring only. `objective_assessments` is scored quiz evidence and is the only reportable stream. The `objective_mastery` view reads exclusively from assessments, so a dashboard query cannot pull in inferred mastery by mistake. The wall is structural rather than a convention someone has to remember.
- **Mastery is computed, never stored.** The rule lives in a view so the weighting can change without a migration and without rewriting history.
- **Neither stream has a client INSERT policy.** Both are written server-side with the service role. A student who can insert `is_correct = true` has a report that means nothing — and an unverifiable report is worse than no report, because someone will act on it.
- **Objective ids are permanent.** Format is `lesson-slug.short-fragment`, assigned once. Rewording an objective's text is fine and expected; changing its id orphans every mastery record pointing at it. 48 objectives, 16 of them safety-critical.

---

## Migrations `0012`–`0013`

**`0012` — guardian invite tokens.** Adds `token_hash`, `token_expires_at`, and `token_redeemed_at` to `guardian_links`. Tokens are stored as SHA-256, never raw: `guardian_links` is client-readable under `0007`'s SELECT policy, so a raw token in that table would be handed straight to the student it is meant to constrain. Entropy is 32 random bytes, which is what makes the stored hash safe to expose.

**`0013` — invite race guard.** Adds a partial unique index on `(student_user_id, lower(invited_email)) where status <> 'revoked'`. The invite route reads, then inserts or updates; two concurrent requests could both find nothing and both insert, leaving two live tokens for the same guardian. Revoked rows are excluded so a revoked link can be re-invited later without colliding with its own history.

### Locked design decisions

- **Date of birth is write-once.** The server re-reads the stored value before deciding whether to write, so a stale form or a hand-made POST cannot overwrite one already set. An editable date of birth would let a minor age themselves out of the guardian protections built for them.
- **The guardian invite email does not name the student.** Sending a minor's name to an address that has not yet been verified as their guardian is a disclosure the flow cannot justify. The cost is a parent who may not immediately know which child it is about.
- **Guardian invite tokens are single-use and expire in 14 days.** Redemption re-checks both at write time, not only at render, and the update is conditional on `token_redeemed_at is null` so the TOCTOU window between check and write is closed.
- **The invite route lowercases `invited_email` before every read and write.** This is load-bearing, not tidiness: `0013`'s index is on `lower(invited_email)`, so removing the lowercase would turn a found-existing-row into a constraint violation.

---

## Migrations `0014`–`0016` — quiz cards

**`0014` — card storage.** `quiz_cards` and `quiz_card_options`. Cards live in the database, not in code — lesson content being hardcoded is architectural debt #1, and cards are the content a CFI corrects most. A check constraint makes `approved` impossible without a `reviewed_by` and `reviewed_at`. Exactly one correct option per card, enforced by a partial unique index.

**`0015` — card sync.** Generated from the reviewed markdown in `docs/cards/` by `node scripts/import-cards.mjs`. Regenerate it; never hand-edit it. Plain Node, no dependencies, so it adds nothing to the locked stack.

**`0016` — the `status` grant.** Fixes the policy/grant interaction described in Environment gotchas. Found by testing on the live site.

### Locked design decisions

- **Answers never reach the browser.** Students are granted only the columns they may see. `quiz_card_options.is_correct` and `quiz_cards.explanation` are ungranted; asking for them as a student returns `42501`. Grading happens in a Server Action using the service role, which is the only code that reads the answer. If the correct option ever reached the client, `objective_assessments` would stop meaning anything.
- **Nothing automated approves a card.** Every import lands as `draft`. Approval is a CFI's name and the date written against the row — a human act.
- **An approval covers the words that were reviewed, not the id.** The sync knocks a card back to `draft` and clears its reviewer whenever its question, options, explanation, or visual changes.
- **Cards removed from the markdown are retired, not deleted.**
- **Options are shuffled on the server, once per render.** The order is passed to the client as data. Shuffling inside a client component would produce different orders on the server and client passes — a hydration mismatch.
- **Grading re-checks that the card is still approved.** A card withdrawn between page load and answer is not scored.
- **Card authoring follows `docs/cards/AUTHORING-RULES.md`.** Eight rules, including: options are shuffled so nothing refers to another by letter; no numbers unless settled across all trainers; sources named, never numbered; never frame a student's doubt about belonging as a defect.

---

## Migration `0017` — account deletion

Deleting an `auth.users` row already cascades nearly all of a person's data away. But four references made the delete itself fail and roll back: `consent.granted_by` and `milestones.created_by` were `NOT NULL` yet `ON DELETE SET NULL`; and check constraints on `milestones` (a confirmed milestone must name its confirmer) and `milestone_contributors` (a credit must name a person or an organisation) were violated when the named account was deleted. `0017` makes both columns nullable and adds a `BEFORE DELETE` trigger on `auth.users`, `prepare_account_deletion`, that settles those references first. **Verified on the live site Sep 16 2026 by the founder:** deleting a test guardian who had granted consent, confirmed a milestone, and been credited on it failed before `0017` and succeeded after, with the consent kept but revoked, the milestone reverted to self-reported, and the credit removed.

### Locked design decisions

- **When the account that granted consent for someone else is deleted, the consent is revoked, not erased.** The subject falls back to no consent — the safe default for a minor — and the grant, who it covered, and why it ended stay on record.
- **When a person's own account is deleted, their consent history is erased with it.** This is the existing cascade. **It needs a lawyer's answer before any school contract**: privacy law generally favours deletion, but a school may later ask for proof that consent existed.
- **A confirmation that can no longer be attributed stops counting.** A milestone confirmed by a deleted account reverts to self-reported rather than claiming a confirmation nobody can stand behind.
- **Only the student or a verified guardian of a minor may export or delete an account**, in the first version. Deletion requested by a school comes later, once school admin accounts exist.

**Data export — `GET /api/account/export`, "Download my data" on `/profile`.** Verified on the live site Sep 16 2026: the founder's own export contained their email and today's tutor messages with no `token_hash`, and a logged-out request returned only a 401. Reads with the service role so tables without a student SELECT policy are not silently omitted; **every one of the 14 reads is filtered by the id from `getUser()`, never by anything in the request — keep it that way.** It exports the account holder's own data only (other people's account ids are left out), reads in pages because Supabase caps a request at 1,000 rows, fails entirely rather than returning a partial file, and is sent `Cache-Control: private, no-store`.

**Account deletion — `deleteAccount` Server Action, "Delete my account" at the bottom of `/profile`.** Verified on the live site Sep 16 2026 with a throwaway account holding real tutor messages: a wrong password was refused with the account intact, then the correct password and `DELETE` removed the auth user, profile, and messages, with the id returning `0` from all three. Requires the account's password as well as the typed word, both re-checked on the server — a signed-in session alone is not enough on a shared device. **`deleteUser` must be called with `shouldSoftDelete: false`.** A soft delete keeps the `auth.users` row, so no cascade runs and every table keeps the data while the account looks deleted. The confirmation word lives in `src/lib/account-deletion.ts` because a `"use server"` module cannot export it.

**Guardian view — "Students you're a guardian for" on `/profile`.** Verified on the live site Sep 16 2026 with a test guardian and a 15-year-old test student: with an email-invite link there was no download button and a hand-typed `/api/guardian/export?student=<id>` was refused; after upgrading the link to `staff_manual` the download worked; a wrong password was refused, the correct one deleted the student; and the founder's own "Download my data" still worked on the shared export module. All permissions are decided in `src/lib/guardian-access.ts`, and **both the download route and the delete action re-run `authorizeGuardianAction` on the server at the moment of acting** — the page only decides what to show. Both exports come from one set of queries in `src/lib/account-export.ts`. **On a guardian's profile, their own delete is headed "Delete my own account" with a "This deletes you, not a student" warning**, and their own download is labelled as their own — added after the founder mistook the two while testing, a mistake the password and typed word cannot catch. Verified on the live site Sep 16 2026; a student's profile is unchanged.

### Locked design decisions — guardian powers

- **Any verified guardian may delete a minor's account. Only a guardian verified by `school_roster` or `staff_manual` may download it.** An email invite proves control of a mailbox, not guardianship, and a download is a minor's private tutor conversations. Same tiering as `live_session`. (Founder, Sep 16 2026.)
- **Guardian actions require a student whose date of birth is on file and under 18.** This deliberately inverts the rest of the app. Elsewhere unknown age is treated as a minor because that restricts the student; here the same assumption would hand an outsider power over someone who may be an adult, so unknown age means no guardian actions.
- **After verification, a guardian sees the student's first name and email.** The rule against naming the student applies to the invite email, which goes to an address not yet verified. A verified guardian needs to know which student they are about to act on.
- **Every refusal from the guardian download returns the same message**, so the route cannot be used to learn whether a student exists or is linked to anyone.

### Not reachable by deleting an account

Deleting the database rows does not touch copies held elsewhere: Vercel runtime logs (user ids, briefly retained), Resend's send log (guardian email addresses), Supabase Auth logs, and the conversations the tutor sends to Anthropic to generate replies. These belong in a privacy policy and data processing terms, not in code.

**Known trap, not yet fixed:** deleting an **organisation** credited alone on a milestone would fail the same way — `milestone_contributors.contributor_org_id` is `ON DELETE SET NULL` under the same person-or-organisation check. Nothing creates organisations or credits yet; fix it when school accounts are built.

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
