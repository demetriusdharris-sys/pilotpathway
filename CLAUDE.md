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
- **A commit message is not a record of apply state.** Migration commits say "(not yet applied)" because that was true when the file was written; they are never amended once the migration is applied. **As of Sep 23 2026, every migration `0001` through `0025` is applied to production and verified.** Do not infer from a commit message that a migration is pending — ask, or check the database.
- **Secrets are not visible from the repo, and their absence there means nothing.** `.env.local` is gitignored and Vercel environment variables live in Vercel, not on disk. `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are all set in both. Do not conclude a key is missing because grep did not find it.
- **`pnpm lint` and `pnpm exec tsc --noEmit` do not catch Next's Server Action export rules.** A `"use server"` module may only export async functions; exporting a sync helper from one passes both checks and then fails `pnpm build`. Run the build whenever you touch a `"use server"` file.
- **A `RETURNS TABLE` clause declares variables, and they shadow column names.** `0024` returned `table (raw_score smallint, question_count smallint)`; inside the body `question_count` then matched both that output variable and the column on `practice_attempts`, and every submit failed with `column reference "question_count" is ambiguous`. The migration applied cleanly — the ambiguity only bites when the function runs — and nothing in lint, tsc or the build can see inside a function body. `0025` fixed it by returning void and qualifying every column reference. **Qualify columns inside plpgsql, and give a function the narrowest return type its caller actually uses.**
- **Column-level grants and RLS policies interact, and nothing but the live database will tell you.** When a table hides columns with `GRANT SELECT (...)`, every column an RLS policy reads must also be granted to the role running the query — above all when a policy on one table checks another table in a subquery. `0014` granted `quiz_cards` without `status`; the `quiz_card_options` policy checks `status` in a subquery, so every student read of the options failed with `42501` and the quiz silently rendered nothing. Lint, typecheck, and the build all passed. **The Postgres hint on that error suggests `GRANT SELECT ON <table>` — never follow it on a table that uses column grants to hide data.** It grants every column, including the ones being hidden. Grant the single column the policy needs, as `0016` did.
- **A brand-new route can keep 404ing after a good deploy, and a hard refresh will not fix it.** Vercel's edge cached the legitimate 404 from before the route existed, and Ctrl+Shift+R clears the browser, not Vercel. `/review` returned our `not-found.tsx` on the founder's browser while the same URL redirected correctly to `/login?next=/review` from outside — the deployment was Ready and the route was in the build. **Add a query string to get a fresh cache key** (`/review?status=draft`) to tell a cached 404 apart from a missing route. Confirm the route is live from a signed-out request before doubting the code. **An existing page serves stale the same way after a deploy** — the quick-test gate looked not to have shipped until a hard refresh, twice in two days. **Hard refresh before diagnosing anything that looks like a change that did not deploy**, and prefer a message that actually changed as the tell: the full test's wording was identical in both builds, so it proved nothing about which was live. **Measured Sep 24 2026**, and deliberately left alone: an unmatched path returns `cache-control: public, max-age=0, must-revalidate` with `x-vercel-cache: HIT`, while a real dynamic route returns `private, no-cache, no-store` and always MISSes. So the 404 is edge-cached and the route is not — that is the whole mechanism. **Middleware cannot fix it**: it runs before routing and cannot know the response will be a 404, so the only available change is `no-store` on everything — which would stop the edge serving the prerendered home and legal pages and send every visit to origin, a permanent cost to students on cheap phones to fix an annoyance that only ever affects us in the minutes after a new route deploys. An allowlist of cacheable paths is worse: forgetting a future static page loses its caching silently. Habit over code here.

---

## Conventions

- Server Components by default. `"use client"` only when needed.
- Named exports except `page.tsx` and `layout.tsx`.
- No `any`. Use `unknown` with narrowing. This rule currently holds at zero violations — keep it that way.
- Never use `localStorage` or `sessionStorage`.
- **Gold text on a light background is `text-gold-strong`, never `text-gold`.** `--gold` is 2.09:1 on white and fails WCAG AA for text of any size; `--gold-strong` is 5.11:1. `text-gold` is correct only on navy (7.45:1), and `bg-gold` with `text-gold-foreground` is correct for buttons. Decorative glyphs marked `aria-hidden` are exempt.
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Never `NEXT_PUBLIC_`. Never in a client component.
- New migrations only. Never edit an existing migration file.
- **Profile write allowlist.** Client writes to `public.profiles` are restricted by column `GRANT` to `email`, `display_name`, `first_name`, `date_of_birth`, `updated_at`, and `reviewer_credential` (added by `0030`). Anything else returns `42501`. RLS restricts rows, not columns — the grant is what stops a student setting their own `role` to `admin`.
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
- Curriculum: 16 Stage 1 lessons (Stages 2 and 3 have none yet), stored in the database and editable in the Supabase Table Editor with no deploy. Verified on the live site Sep 16 2026: an edit to a lesson summary appeared on the lesson page without a deploy and was recorded in `curriculum_edits`. Adding a lesson to any stage needs no code change either — verified Sep 17 2026.
- Captain Path tutor chat with conversation memory persisted to `instructor_messages`
- `studentFirstName` and `masteryNotes` wired to real values (previously dead parameters)
- Rate limiting: 150 messages/user/day, 5000 global, configurable in `usage_limits` without a deploy
- Spend metering in `tutor_usage`
- Basic progress tracking, student dashboard, Vercel deploy

**Measured cost:** ~0.48¢ per follow-up exchange with prompt caching (down from ~1.05–1.29¢ before conversation memory was added — caching the 2,700-token system prompt saves more than history costs).

**Objective-signal judge cost:** the Claude Haiku 4.5 call that reads each exchange for per-objective signals adds **~0.05–0.10¢ per exchange** — measured from Vercel runtime logs Sep 16 2026: 0.0546¢ when it found no signal, 0.0979¢ when it found one. That is roughly 11–20% on top of the tutor call, so a full exchange costs ~0.54–0.58¢. It is logged as `Objective signal call:` with a `costCents` field and deliberately **not** written to `tutor_usage`, because it is our inference cost, not the student's usage. Vercel runtime logs are retained only briefly — to re-measure, send a tutor message and search `costCents` within minutes. **The judge is skipped on the canned starter prompts**, which carry no evidence of what the student knows, and logs `Objective signal call skipped: starter prompt` instead. The starters are defined once in `src/lib/tutor-starters.ts`, used by both the lesson page and the route, and recognised on the server by exact text — keep it the single definition, or editing a starter's wording silently re-enables the paid call. Verified on the live site Sep 16 2026: a starter logged the skip with no `costCents`, a typed question logged a normal call.

**Known open bugs:**
- **Almost no quiz card is approved, so almost no student sees a quiz and `objective_mastery` — the only reportable stream — is nearly empty.** The machinery is built and **the whole chain is verified end to end as of Sep 24 2026**, and since Sep 23 2026 a CFI does the reviewing in the app at `/review/cards` (see below). **All 144 cards read `draft`** — five were approved on Sep 24 2026 to verify the chain and then reset, because a founder's approval is not content clearance and a beta student would otherwise see a quiz no CFI had checked. The assessments from that run remain, so `objective_mastery` still holds a mastered row; with no approved card the lesson page shows no marks at all, which is the rule working rather than data lost. The blocker is purely a CFI's time on the 144. **Stage 1 is now fully covered — all sixteen lessons, all 48 objectives, three cards each** (Sep 22 2026). 22 cards carry a `[CFI: confirm value]` gap and 17 carry an open question for the reviewer; **a card with a gap must not be approved as it stands**, because the placeholder would render to a student. Sent to a CFI Sep 22 2026; no answer yet. That is a person, not engineering, and it is the single biggest thing between this product and outcome data for a school.

---

## Practice tests — migrations `0022`–`0025`

A student sits a randomised, stratified practice test drawn from original questions keyed to ACS codes. **Nothing costs an Anthropic call at test time**: explanations are written once and stored, and a test is database reads. Free to every student, permanently — the same rule as safety content.

**Verified end to end on the live site Sep 23 2026**, against a throwaway synthetic bank since no real question is approved yet: a 60-question test assembled with a timer, answers saved per tap, **a mid-test refresh on a phone kept every answer**, submission scored and produced the report, and **a second test drew different questions** — which is the exposure write proving itself. The synthetic bank was then deleted and the bank read back at zero.

### The tables

| Table | What it holds |
|---|---|
| `question_bank` | Original questions: ACS code, knowledge area, stem, three choices, answer, explanation, optional figure |
| `practice_attempts` | One sitting: mode, question count, score, and a readiness estimate with its confidence |
| `practice_answers` | One row per question served, with the choice order it was displayed in |
| `question_exposure` | What this student has seen, how often, and when — the heart of the non-repeat engine |

### Locked design decisions

- **Only `cfi_approved` questions are ever served**, enforced by the RLS policy and again in every query. A draft question must never reach a learner. **"Derived from FAA material" is not a substitute for review** — the derivation is where the errors enter, and the cost of a wrong one lands on the student in a cockpit or an oral exam.
- **`correct_choice` and `explanation` are not granted to `authenticated` at all.** The spec asked to hide them until submission; column privileges cannot express a per-row condition, and a view that pretends to is how `0014` shipped a bug. The answer is simply unreachable from a browser, and a Server Action returns the explanation after grading. `is_correct` on `practice_answers` is ungranted for the same reason — a student could otherwise ask mid-test whether they were right.
- **Students never write their own answers.** Selections are saved server-side with the service role; grading happens once, in `submit_practice_attempt`. Same reasoning as `0009`: a readiness score a student can forge is worse than none.
- **The whole paper is fixed when the attempt starts** — which questions, in which order, with which choice order. A refresh, a dead connection, or a sleeping phone resumes the same test. Assembling per render would hand out a different test on every reload.
- **Answers are saved on every tap, with the state shown**, and a failed save is retried once and then said plainly. This audience is mobile-first on unreliable connections; a silently lost answer is a wrong score.
- **Choice order is shuffled per attempt and stored.** The student submits a display position, never a letter, and `selected_choice` is stored canonically. "It was the second one" is worth nothing.
- **Scoring and exposure happen in one transaction**, because supabase-js cannot wrap three statements and a half-written submit would let the engine re-serve questions the student just saw.
- **Unanswered questions stay null rather than counting as wrong.** A skipped question and a wrong answer are different facts; only the score treats them alike.
- **The test blueprint is ours, not the FAA's.** 14 CFR 61.105(b) names the knowledge areas; the per-area question counts are not published. `TEST_BLUEPRINT` in `src/lib/practice/assemble.ts` holds our weights, summing to 60, and **a CFI should review them** before a readiness number rests on them.
- **Both whole-test modes are refused unless every area can be filled**, the quick test against the blueprint scaled to 20. A test silently missing regulations or weather is worse than no test; targeted practice still works on the areas that are ready. The rule lives once, in `canFillBlueprint`, because two copies of it is how the quick test came to be offered on four questions in one area — found on the live site Sep 24 2026, while the copy promised "20 questions, same spread". A quick test still opens earlier than a full one: it needs 12 of the 13 areas, since the smallest rounds to no slots at 20 questions, which is the same arithmetic that stops a quick test maturing a readiness score. **Verified on the live site Sep 24 2026** with four approved questions in one area: both modes refused, targeted practice still worked. Five assertions in `check-assembly.mjs` cover it, including that a quick test can never be stricter than a full one.
- **The recency rule is a floor.** A question seen in the last three days is excluded outright, relaxing to 24 hours and then not at all, only when the bank cannot fill the slots — and every relaxation is logged, because it is the bank saying it is too thin in that area. `getBankHealth()` is the admin-side view of the same fact, never shown to students.

**From the FAA Airman Knowledge Testing Matrix: PAR is 60 scored questions, 2.0 hours, passing 70.** **Confirmed Sep 23 2026 against the matrix itself** (revised 10/22/25), now kept at `docs/reference/airman-knowledge-testing-matrix.pdf`. Reduced from 2.5 hours in April 2023, which is why older sources disagree.

**The FAA's site blocks automated readers, so the reference documents live in the repo.** `docs/reference/` holds the testing matrix and the Private Pilot ACS, both public domain. `node scripts/build-acs-index.mjs` turns the ACS into `docs/reference/acs-codes.json` — 1,136 codes across 12 areas of operation and 60 tasks — and **`import-questions.mjs` refuses any ACS code that index does not contain**, which is what stops an invented or stale code reaching a student's report. Regenerate the index when the ACS is revised; questions keyed to codes that vanished will then fail the import, which is the point.

**Testing without real content:** `node scripts/build-synthetic-seed.mjs` writes a throwaway bank into `docs/tmp` plus its own cleanup. The questions are **transparently fake and contain no aviation claims**, because an approved row is servable to a student and the harm in unreviewed content is a wrong fact. Seed, test, delete, and check the bank reads zero. `scripts/check-assembly.mjs` exercises the selection logic with no database at all.

### Readiness — `src/lib/practice/readiness.ts`

Computed per ACS code, rolled up per knowledge area, weighted by how much of the real test each area is. **Never from a single attempt's raw score.** Stamped onto the attempt at submit so history shows what was believed at the time. **Verified Sep 23 2026** by five fixtures in `scripts/check-readiness.mjs` and on the live site against the synthetic bank.

- **No number without coverage.** Fewer than 3 answered questions in an area and that area reports `insufficient_data`; if any area is short, the overall score is **null** — not a number with a caveat, which students read as a number.
- **The recommendation is gated separately from the score.** Any single area below 70% blocks a booking recommendation however good the average looks. The fixture that proves it reads 88% overall and still says "Not yet — one weak area is enough to fail".
- **A known weak area is named even while the overall picture is thin.** Found on the live site: a student at 23% in one area with one or two answers elsewhere was being told only "not enough practice yet", which reads as "nothing is wrong". Refusing to call someone ready and refusing to warn them are different things. That case is now a fixture.
- **Recent answers count for more**, on a 30-day half-life, so a fortnight of real work is not buried under early mistakes.
- **Overall confidence is the weakest area's, not an average.** Nine strong areas and four untouched is not moderate evidence about the test; it is no evidence about a third of it.
- **A ready student is still pointed at their CFI**, because the endorsement is theirs to give.
- **Quick tests cannot mature a readiness score, and that is deliberate** (founder, Sep 23 2026). The smallest areas are one question in sixty and round to zero on a 20-question test, so full-length tests are what build coverage. The copy says so rather than leaving a student wondering why the number never appears.

**What is not built yet:** figures rendered inline rather than referenced by number, and an admin page over `getBankHealth()`. Authoring and review pipelines now exist — see below. Rule 6 of the spec is half-built: a weak code links to its lesson, but the weak area is **not** preloaded into the tutor's `masteryNotes` — that needs a change to the AI instructor, which this build was told not to touch. **The bank holds one approved question**, from testing the review page Sep 23 2026 — not a release. Roughly 600 approved questions would give one student ten non-repeating full tests; about 180 makes a usable first release.

---

## Question authoring and review — migrations `0026`–`0028`, `/review`

Questions are written as markdown in `docs/questions/`, imported by `node scripts/import-questions.mjs` (which generates `0027_sync_question_bank.sql`), and reviewed by a CFI at `/review`. **The markdown is the source of truth, and the database is downstream of it.**

**`0026`** adds `source_key` (a stable id under a partial unique index, so re-importing updates rather than duplicates), `source_note` (what the question was written from), and the `unapprove_changed_question` trigger — any edit to a question's wording knocks it back to `draft` and clears its reviewer, for the same reason `0015` does it to cards. **`0027`** is generated; regenerate it, never hand-edit it, and re-apply it in the SQL Editor or the new questions exist only in the repo. **The `ON CONFLICT` clause must repeat the index predicate** — `on conflict (source_key) where source_key is not null` — because the unique index is partial and Postgres will not otherwise match it.

**`0028`** adds the `needs_changes` state, `review_note`, `may_review_questions()` (roles `mentor` and `admin`), and `review_question(uuid, text, text, text)`.

**Verified on the live site Sep 23 2026** against the five draft weather questions, as `admin`: approving one wrote the reviewer's name and moved the counts; sending one back with an empty note was refused with the function's own wording, and with a note landed in "Sent back" showing the note; cutting one retired it.

### Locked design decisions

- **A reviewer cannot edit wording on the review page, and there is no edit box.** The next `import-questions.mjs` sync would silently overwrite a database correction, and a CFI who watches their fix vanish stops trusting the pipeline. "Send back with a note" is how a correction reaches the place that lasts.
- **`0028` grants nothing.** Its first draft granted `correct_choice` and `explanation` to `authenticated` so a reviewer could read them — which would have handed the answer key to every student, because a GRANT is role-wide and RLS restricts rows rather than columns. The same mistake as `0014`, in reverse. The page reads with the service role in server code **after** checking the caller's role; the migration carries a comment block saying so, and it should stay there.
- **`recordReview` deliberately uses the reviewer's own client, not the service role.** `review_question` checks the role from `auth.uid()`, and the service role sails straight past that check. A page showing a button is not what makes someone a reviewer.
- **A question carrying `[CFI: confirm value]` cannot be approved.** The Approve button is disabled and the function refuses independently. **The function's own refusal is present but unexercised** — it sits behind a disabled button, and it cannot be tested from the SQL Editor either, because `auth.uid()` is null there so it would refuse for the wrong reason.
- **`role` is outside the profile write allowlist, so a reviewer is made in SQL.** `update public.profiles set role = 'admin' where lower(email) = '…'`. A student who could set their own role could approve their own questions, and approval is what makes a question servable to everyone else.
- **The reviewer's name lives on their profile — `profiles.reviewer_credential`, migration `0030`.** `0028` carried it in a `?as=` URL parameter, justified on a guest-CFI-on-a-borrowed-account case that I invented and that has not arisen; it traded a real problem for a hypothetical one. A CFI works a queue of 144 cards over weeks, and "Jane Doe, CFI 1234567" one evening and "J. Doe" the next is an inconsistent signature on the record a funder, a school or the FAA may read. **Self-writable, and that changes nothing about trust:** a reviewer types their own name either way, it is never verified, and it grants nothing — `role` decides who may review and stays outside the write allowlist. The name box is a plain Server Action form with no `useActionState`, so it works with no client JavaScript.
- **Reviewers reach the queue from the dashboard**, on a link shown when `may_review_content()` is true, mirroring the `/school` link for staff. Before that a CFI needed a URL somebody had emailed them and saw nothing in the app suggesting they had access — a poor welcome for the person the whole queue waits on. The check fails soft to no link.

**Verified end to end Sep 24 2026**, on top of the three decisions already watched. Four questions approved with a reviewer's name and timestamp on the row; a non-reviewer account (`+test7`) saw "Nothing here for this account" on both review pages; and a targeted practice test then drew **exactly those four** and scored them, with four `question_exposure` rows and a readiness of `null`/`insufficient_data` rather than a percentage off four answers. That last step is the one that proves review connects to serving.

**The value-gap refusal was proven server-side, and the technique is worth keeping.** The Approve button is disabled client-side, so the function's own check sits behind it and looked untestable. Load the page with the question clean, add the gap in the database *without reloading*, then press the live Approve button: the function refuses a page that still believes the question is fine. It is also a real scenario — content edited between page load and decision — not a contrivance.

The five weather questions are test content. `update public.question_bank set review_status = 'draft', reviewed_by = null, reviewed_at = null, review_note = null;` puts them back, and `PA.I.C.K3d.q1` deliberately keeps a ` Expect a ceiling of [CFI: confirm value] feet.` suffix on its stem as the standing gap fixture.

---

## Card review — migration `0029` and `/review/cards`

A CFI reviews the 144 quiz cards in the app: status tabs with counts, a lesson list so 144 cards can be worked through over several sittings with visible progress, and per card the objective it assesses (marked **safety-critical** where it is), the correct option, the explanation, the planned picture, and our own written-down doubt where there is one. Reads through `src/lib/card-review.ts`; the queue page reuses `isReviewer` from `src/lib/practice/review.ts`.

**Verified on the live site Sep 23–24 2026** as `admin`, against all 144 draft cards. The refusals first: a flagged card refused approval with an empty note; a card with a value gap had Approve greyed out; and a card with **both** showed the doubt panel while still refusing approval, which is the case proving the two markers are not treated alike. Then the write path, Sep 24: five cards approved with a reviewer's name and timestamp on each row, and a non-reviewer account saw "Nothing here for this account".

**The whole chain was then watched end to end for the first time** — CFI approves cards in the app → a student's lesson page shows the quiz → three correct answers write `objective_assessments` → the `objective_mastery` view flips `is_mastered` → the lesson reads **Shown** and the counter reads "1 of 2 shown". A second account (`+test7`) saw the same quiz, confirming an approval is global rather than scoped to the reviewer, and the objective with no approved card carried **no mark at all**, which is the rule keeping the counter honest. Nothing had been verified through this chain since `0020` changed what mastery means.

**`0029`** adds `needs_changes` to the status check (invisible to students — `0014`'s policy is `status = 'approved'`, so no policy changed), `review_note`/`review_note_at`, `author_note`, `may_review_content()`, and `review_card(text, text, text, text)`. Card ids are `text`, not `uuid`. **The regenerated `0015` fills `author_note` and must be re-applied after `0029`** — its report now counts `flags_carried`, which must read 17.

### Locked design decisions

- **A `FLAG FOR CFI` and a `[CFI: confirm value]` gap are different, and the migration treats them differently.** A gap **blocks** approval: it is a placeholder that would render to a student as written. A flag **does not**: it is a question *for* the reviewer, and answering it is what approving means — blocking it would make those 17 cards unapprovable without a code change. But **approving a flagged card requires a note**, and that note is the answer, kept on the row. Unlike `review_question`, a card approval keeps its note for exactly this reason.
- **The flag had to reach the database or the page would be a rubber stamp.** The parser always extracted it and the printed packet always showed it, but `0015` never carried it — so a page reading the database alone would have let a CFI approve precisely the 17 cards that most need a person without ever showing them our doubt.
- **A new or changed flag resets a review; a removed one does not.** A doubt added after an approval is one the reviewer never saw, so the approval no longer covers the card. A doubt that disappeared is one they answered, and un-approving for that would punish answering it — and loop, since the answer is what removed it. Hence the `excluded.author_note is not null` guard in the sync rather than a bare `is distinct from`.
- **`may_review_content()` is the single definition of who may review**, and `may_review_questions()` delegates to it, so `0028` needed no change and two functions cannot drift apart.
- **`0029` grants nothing**, for `0028`'s reason exactly: `quiz_card_options.is_correct` and `quiz_cards.explanation` are ungranted so a student cannot read the answer key, and a GRANT is role-wide. The page reads with the service role after checking the caller's role.
- **Options are shown in stored order here, not shuffled.** This is a reviewer checking a card against its document, not a student sitting a quiz. Students still see them shuffled, which is why no card may refer to another option by letter.
- **There is no edit box, and there must not be one.** The markdown is the source and the next sync overwrites the row, so a correction typed here would vanish and a CFI who watches that happen stops trusting the pipeline. "Send back" with a note is how a fix reaches the place that lasts.
- **Objective wording, lesson titles and the safety-critical badge fail toward absent.** They are context, not correctness: a missing badge is a gap, a wrong badge is a false assurance, and neither should hide a card a CFI is waiting on.

---

## Beta readiness — Sep 23 2026

**Password reset**, `/forgot-password` → recovery email → `/reset-password`. **Verified on the live site Sep 23 2026 by resetting a password on a phone**, which is the case the design exists for. The callback already accepted `recovery` as an OTP type, so no code changed there. **The Supabase Reset Password template had to change to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery`** for exactly the reason the signup template did — the default is a PKCE link that only works in the browser that asked for the reset, and a locked-out student on a phone has no other way in. Both templates are recorded in `docs/auth-email-templates.md`.

- **The reset form answers identically whether or not the address has an account.** Signup goes to trouble not to reveal which emails are registered; a reset form saying "no such account" would give away the same fact for free. Only a rate-limit error is reported, because a student can act on that one.
- **No current password is asked for.** The person resetting is by definition someone who does not have it; possession of the single-use, short-lived link is the authorisation.
- **`requestPasswordReset` always passes `?next=/reset-password`**, which is what makes the template's `&token_hash=` valid. Same load-bearing coupling as signup — do not make it conditional.
- **`/reset-password` with no session says the link expired and offers a new one**, rather than rendering a form that would fail on submit.

**Legal pages and a contact route:** `/privacy`, `/terms`, `/contact`, linked from the home page footer, both auth screens, and a line on the signup form. **PilotPathway.ai is a project of Equity Engine, a 501(c)(3) fiscal sponsor**, which is the entity named as accountable. The published address is `demetrius@pilotpathway.ai`, confirmed to receive mail Sep 23 2026.

- **The policy describes what the code does**, not what a template says. Every claim points at a table or a route, including that tutor conversations are sent to Anthropic and what deleting an account does not reach.
- **It names the two unsettled questions in a section of their own** — whether a record of consent should survive deletion, and whether the guardian action record should identify the student — with what is true today for each. **Neither page has been reviewed by a lawyer, and Equity Engine should review both before a real beta.**
- **Contact is a published address, not a form.** A form needs delivery, spam handling and a reply path, each of which can fail silently, leaving a student who reported a wrong regulation believing they were heard.

**Error pages:** `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`. **Verified on the live site Sep 23 2026** with a temporary throwing route, since deleted: the error page rendered with reference `3100928808`, and searching that string in the Vercel runtime logs found the matching entry.

- **The reference code is the feature.** It is Next's `digest`, which is also written to the server log, so a student quoting it makes an otherwise unsearchable "it broke yesterday" findable. Vercel keeps runtime logs briefly and nobody watches them live, so without it a beta report is unactionable.
- **The error page never guesses what went wrong.** Telling a student to check their connection sends them chasing a fault that is ours.
- **`global-error.tsx` uses a plain `<a>`, with the lint rule disabled and a comment saying why.** `next/link` needs the router, and the router is inside the layout that just failed.

**Still open before a beta:** the CFI review (no approved cards, so no quiz and no mastery data), the two lawyer questions, and Equity Engine's review of the legal pages. Not blocking: school admin screens, cohorts, per-objective teacher detail, Stage 2 and 3 content.

---

## Architectural debt (deliberate, not yet paid)

**1. Lesson content was hardcoded — paid for the founder, Sep 16 2026; still owed for CFIs.** Stages, lessons and objectives now live in the database and the founder edits them in the Supabase Table Editor with no code change and no deploy (see "Curriculum content" below). What is still owed: a CFI cannot edit content, because that needs an in-app editor with permissions, and edits go live with no review step. Both belong together — build the review step at the same time CFIs get editing access.

**2. Progress tracking was a checkbox — paid Sep 17 2026 for the student, Sep 22 2026 for school staff.** `lesson_progress` is still one three-state flag per lesson, but it is no longer all a student sees: each objective on a lesson page now reads Shown / Keep going / Not shown yet, and each stage on the dashboard reads "N of M objectives shown" (see "What a student has shown" below). School staff now see the students who chose to share with them, at `/school` (see "Schools and staff" below). What is still owed: there is no admin interface — organisations and memberships are created in SQL — no cohorts, no per-objective detail for a teacher, and no aggregate reporting for a district or sponsor, which is a different audience and stays aggregate.

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

**`0010` — objective sync.** Loaded the 48 objectives from what was then `src/lib/curriculum.ts` into `learning_objectives`. **Historical — never re-run it.** Since `0018` the database is the source of truth for objectives, and re-running `0010` would overwrite live edits with stale text. `curriculum.ts` now holds types only, so the file cannot be regenerated either.

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
- **Losing the `0013` race returns 409 `invite_in_progress`, never a retryable error.** The winning request created the invite and sends its email; the loser returns before sending anything, since its token never reached the database. It must not tell the student to try again: a retry finds the pending invite and resends, replacing the token and breaking the link just delivered. The form shows it as a notice and refreshes to the pending card. Verified on the live site Sep 16 2026 by firing two simultaneous invites from the browser console: one `200`, one `409`.

---

## Migrations `0014`–`0016` — quiz cards

**`0014` — card storage.** `quiz_cards` and `quiz_card_options`. Cards live in the database, not in code — lesson content being hardcoded is architectural debt #1, and cards are the content a CFI corrects most. A check constraint makes `approved` impossible without a `reviewed_by` and `reviewed_at`. Exactly one correct option per card, enforced by a partial unique index.

**`0015` — card sync.** Generated from the reviewed markdown in `docs/cards/` by `node scripts/import-cards.mjs`. Regenerate it; never hand-edit it, and **re-apply it in the SQL Editor after regenerating**, or the new cards exist only in the repo. Safe to re-run. Plain Node, no dependencies, so it adds nothing to the locked stack. **A markdown file in `docs/cards/` counts as a card document by its first line, `# Quiz cards for review …`** — not by its filename. The scripts print what they ignored, so a card document with a mistyped heading shows up rather than vanishing.

**`0016` — the `status` grant.** Fixes the policy/grant interaction described in Environment gotchas. Found by testing on the live site.

### Locked design decisions

- **Answers never reach the browser.** Students are granted only the columns they may see. `quiz_card_options.is_correct` and `quiz_cards.explanation` are ungranted; asking for them as a student returns `42501`. Grading happens in a Server Action using the service role, which is the only code that reads the answer. If the correct option ever reached the client, `objective_assessments` would stop meaning anything.
- **Nothing automated approves a card.** Every import lands as `draft`. Approval is a CFI's name and the date written against the row — a human act.
- **An approval covers the words that were reviewed, not the id.** The sync knocks a card back to `draft` and clears its reviewer whenever its question, options, explanation, or visual changes.
- **Cards removed from the markdown are retired, not deleted.**
- **Options are shuffled on the server, once per render.** The order is passed to the client as data. Shuffling inside a client component would produce different orders on the server and client passes — a hydration mismatch.
- **Grading re-checks that the card is still approved.** A card withdrawn between page load and answer is not scored.
- **The CFI review packet is generated, never written by hand.** `node scripts/build-review-packet.mjs` turns the same card documents into `docs/cards/review-packet.html` — one self-contained printable page with every card, its correct answer, its explanation, the planned picture, a tick-box review line per card, and a sign-off block. `scripts/lib/cards.mjs` is the single parser behind both it and the sync migration, so the page a CFI signs and the rows a student sees cannot drift apart. Regenerate both after editing any card document. The packet marks `[CFI: confirm value]` as "value needed" and prints each `FLAG FOR CFI` beside its card, so nothing we owe an answer on can be skimmed past. Nothing in the packet writes to the database. **It is now the offline fallback, not the main path** — `/review/cards` is where a CFI reviews, and it shows the same facts with the decisions attached.
- **`docs/cards/recording-approvals.md` is the SQL fallback**, for a CFI who will not use a browser or an account. Prefer `/review/cards`: the SQL path makes a CFI's review time into the founder's transcription time, and every transcription can approve wording that is not quite what was read. A wording change is never made in the database either way: the markdown is the source, and the sync would overwrite it.
- **Card authoring follows `docs/cards/AUTHORING-RULES.md`.** Eight rules, including: options are shuffled so nothing refers to another by letter; no numbers unless settled across all trainers; sources named, never numbered; never frame a student's doubt about belonging as a defect.

---

## What a student has shown — per-objective mastery, and migration `0020`

Each objective on a lesson page shows its state, and each stage on the dashboard shows "N of M objectives shown". Read through `src/lib/objective-mastery.ts` and rendered by `src/components/objective-list.tsx`. **Verified on the live site Sep 17 2026** with one temporarily approved card, since reverted to draft: no marks at all before approval; "Not shown yet" once a quiz existed; "Keep going" after one correct answer; **Shown** and "1 of 1" on both pages after three in a row; and back to "Keep going" and 0 of 1 after a wrong answer.

**`0020` changed what mastery means.** `0009` said "three correct, and no wrong answer in the last 90 days". The live test showed a student who answered wrong once and then correctly five times still did not count, and could not until December. A ground school cannot punish being wrong for three months — getting it wrong and then working it out is the behaviour the quiz exists to produce. The rule is now **the last three attempts are all correct**: still three in a row, still lost by a later wrong answer, but recoverable immediately and explainable to a student in one sentence. Mastery lives in a view precisely so this could change without rewriting anyone's history, which is what happened.

### Locked design decisions

- **Only quiz evidence is ever shown as progress.** `objective_signals` — the tutor's read of a conversation — steers the tutor and never reaches this display. What a student is told they have shown, and what a school is eventually reported, must rest on something that was marked.
- **An objective with no approved card gets no mark at all**, rather than "not shown yet". Telling a student they have not shown something we never asked them is our failure reported as theirs. `loadAssessableObjectives` is what draws that line, and the counts on both pages have it as their denominator — so the numbers say "of what you could show today", never "of 48".
- **Every mastery read fails soft.** A failed read renders as no marks, which is the same as no evidence. Claiming mastery that cannot be verified is the only failure here that would matter.
- **Mastery is shown to the student only.** No staff or guardian view of it exists yet; building one goes through the consent scopes in `0006`.

---

## Schools and staff — migration `0021` and `/school`

**Verified end to end on the live site Sep 22 2026**, with a test school, the founder as `org_admin`, and `+test7` as an enrolled student: the student saw a "Your school" section and shared; the roster showed "1 of 1 sharing" with their name and counts; the student stopped sharing and vanished from the roster; and a student typing `/school` directly got "Nothing here for this account".

**`0021` fixed a hole found while reading the schema, before anything was built on it.** The three policies that let staff read a student's progress asked "do we share an organisation?" and "has this student consented to `school_progress`?" — and never checked **which organisation the consent named**, though `consent.audience_org_id` has recorded it since `0006`. A student in a school and a sponsor's cohort, consenting to the school, was readable by the sponsor's staff. Nothing creates organisations yet, so nobody was exposed. `staff_may_see_progress(student)` now asks the question once, properly, and is the only gate in all three policies.

### Locked design decisions

- **`has_active_consent()` must never gate staff access again.** It answers "did this person consent to this scope at all", which is right for a student's own settings screen and wrong for access control, because it ignores the audience. Its comment in the database says so. Use `staff_may_see_progress()`.
- **A school_progress grant must name an organisation**, enforced by a `NOT VALID` check constraint — binding on every new row, not retrospectively rejecting old test rows, which the new gate ignores anyway.
- **The roster reads mastery through the staff member's own client**, so RLS is what filters it. The service role is used only to put names to ids consent has already cleared, and never to look up a student who has not consented.
- **A consented student with no quiz answers still appears on the roster**, with nothing against their name — otherwise a teacher reads "nobody is sharing" when the truth is "nobody has been asked anything yet".
- **Staff see their own students individually.** That is exactly what the `school_progress` scope says: "lesson and mastery progress visible to school staff". The "aggregate by default" rule in Business decisions is about district and sponsor reporting — a different audience, and still aggregate.
- **Tutor conversations are never on the roster and must not be added.** A student agreed to share progress, not the questions they were embarrassed to ask.
- **Sharing is offered only where the account is an enrolled student.** Staff of an organisation would be sharing with themselves; the control is not shown to them.
- **Revocation is immediate and is the student's own.** Granting goes through the student's client so the INSERT policy from `0007` remains the control; revoking needs the service role, because `consent` deliberately has no client UPDATE policy, and is scoped to that student's own live grant.

**A guardian can share a minor's progress with their school, and stop it.** On `/profile`, each minor a verified guardian is responsible for lists the schools that student is enrolled at, with the same two-way control the student has. **Verified on the live site Sep 22 2026** with a 14-year-old test student and their email-invite guardian: the guardian shared, the student appeared on the staff roster, the student's own profile read "Sharing — agreed by your parent or guardian", and the student stopped it themselves and vanished from the roster.

- **Any verified guardian may share; the tier is `0007`'s, not the download's.** An email invite is sufficient for `school_progress`, and unlike a download this is reversible and attributable — the grant records `granted_by` and `granted_by_relationship`.
- **The student can always revoke what their guardian agreed to**, from their own profile. Revoking shares less, which is the safe direction for a minor, and the guardian can grant again if it was a mistake. A guardian can likewise revoke a grant the student made.
- **The organisation must be one the student is actually enrolled at**, checked in `studentBelongsTo` before the grant. The database does not check this: `0007`'s policy checks the guardian and `0021`'s constraint only requires that *some* organisation is named, so without this check a guardian could consent on a minor's behalf to any organisation id.
- **Staff are not told who agreed.** The roster shows the student and their progress; whether the student or their guardian consented is on the consent record, not on a teacher's screen.

**Known limits:** organisations, memberships, and staff roles are created in SQL — there is no admin UI, and no cohorts. The roster shows counts, not which objectives. Guardian sharing is logged (`Guardian shared student progress:`) but not written to `guardian_actions`, because the consent row itself is the permanent, attributable record.

---

## Curriculum content — migration `0018`

Stages, lessons, and learning objectives live in `curriculum_stages`, `curriculum_lessons`, and `learning_objectives`, and are read through `src/lib/curriculum-store.ts`. **`src/lib/curriculum.ts` holds types only — it is not where content lives.** The founder's editing guide is `docs/editing-lessons.md`.

`0018` created the two tables, seeded them once from the code that existed then, linked every objective to its lesson and stage by foreign key, and added two protections. Verified in production Sep 16 2026: the seed reported 3 stages, 16 lessons, 48 linked objectives and 0 lessons without objectives; renaming a lesson was refused; a test edit was recorded and undone; and a comparison through the new loader against the old code found the database curriculum identical, field for field, before the app was switched over.

### Locked design decisions

- **The founder edits content in the Supabase Table Editor.** There is no in-app editor yet. CFIs editing content needs one, with permissions — a separate project.
- **Edits go live immediately.** No preview or review step. This is no lower a bar than before, when lesson text was written straight into code without CFI review. Revisit when CFIs can edit.
- **Every content edit is recorded.** Triggers write the previous row to `curriculum_edits` on any update or delete to stages, lessons, or objectives, ignoring saves that change only `updated_at`. That table is the undo mechanism; it has RLS on and no policies, so nothing in the app reads it.
- **Objective ids and lesson and stage slugs cannot be changed**, enforced by the `forbid_identifier_change` trigger rather than by convention. Progress, tutor history, mastery, and quiz cards all refer to them.
- **A failed curriculum read throws; it never returns an empty curriculum.** An empty list would render as "lesson not found" or an empty dashboard — an outage disguised as missing content. The tutor route turns it into a 503 saying the lesson cannot be loaded.
- **The lesson page checks sign-in before looking the lesson up.** Lessons are readable only by signed-in users, so looking one up first would turn "please log in" into "not found".

**The dashboard shows every stage that has lessons**, each with its own progress bar, and a stage with none is a "coming soon" card. A lesson added to Stage 2 or 3 in the Table Editor appears with no code change. **Verified on the live site Sep 17 2026:** a temporary Stage 2 lesson appeared in a new Stage 2 section reading "0 of 1 lessons complete" and opened; deleting the row returned Stage 2 to a coming-soon card. Nothing else was Stage 1-specific — the lesson page, tutor, starters and progress were already stage-agnostic.

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

### Guardian action record — migration `0019`

Every guardian deletion or download writes a row to `guardian_actions`, through `src/lib/guardian-audit.ts`. **Verified on the live site Sep 17 2026:** a `staff_manual` guardian downloaded and then deleted a 15-year-old test student, producing two `completed` rows; deleting one of those rows in the SQL Editor was refused with the permanent-record error. Read the table in the SQL Editor; nothing in the app shows it.

- **The record is written before the action, and the action is refused if it cannot be written.** No untraced deletion or download is possible. The row starts as `started` and is settled to `completed` or `failed` afterwards; settling is best-effort, so a row left at `started` means the action was attempted and its result was not recorded — check the logs and whether the account still exists. Guardian actions therefore depend on this table: if it is unreachable, guardians cannot delete or download.
- **No foreign keys to `auth.users`.** The student is gone by design and the guardian may delete themselves later; a foreign key would cascade the record away or block the delete.
- **The guardian's email is copied in; the student's email is not.** An id alone identifies nobody once the guardian's account is gone. The student's email is left out so the record of a deletion does not keep the personal data that was deleted. **Add this to the lawyer's questions** alongside consent history: a school may want the student identifiable in the record.
- **Rows cannot be deleted, and only `outcome` and `finished_at` may change, once, from `started`.** Enforced by the `protect_guardian_actions` trigger, which binds the service role too. RLS is on with no policies and `anon`/`authenticated` have no grants.
- Only deletions and downloads are recorded, not refusals.

### Not reachable by deleting an account

Deleting the database rows does not touch copies held elsewhere: `guardian_actions` (the student's id, by design — see above), Vercel runtime logs (user ids, briefly retained), Resend's send log (guardian email addresses), Supabase Auth logs, and the conversations the tutor sends to Anthropic to generate replies. These belong in a privacy policy and data processing terms, not in code.

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
