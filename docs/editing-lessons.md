# Editing lessons

Lesson content lives in the database and is edited in **Supabase → Table Editor**. No code, no deploy.

**Read this first: your edit is live the moment you save it.** The next student to open that lesson sees it, and Captain Path uses it in its very next reply. There is no preview and no review step. That makes a typo fix instant — and it makes a wrong fact instant too.

---

## The same accuracy rules apply here

Everything the tutor follows applies to anything you type into these tables:

- **Sources by name only:** PHAK, AFH, AIM, 14 CFR. Never a chapter number, section number, or figure number.
- **ACS Areas of Operation by name, never by task code.** Task codes change between revisions, and a student who repeats a stale one to a DPE pays for our mistake.
- **Never state a regulation, weather minimum, or number you are not certain of.**
- **FAA standards stay exact.** Make a lesson clearer, warmer, or more relevant — never easier than the standard.

If you are unsure whether a change is accurate, ask a CFI before you save, not after.

---

## Where things are

| Table | What it holds |
|---|---|
| `curriculum_stages` | The three stages: title, tagline, goal, and the planned-topic outline for stages with no lessons yet |
| `curriculum_lessons` | The 16 lessons: title, one-line objective, summary, sources, ACS areas, topic, history card, minutes, and order |
| `learning_objectives` | The 48 objectives students see under "What you will be able to do", and whether each is safety-critical |

**The Table Editor lists rows alphabetically, not in lesson order.** The order students see comes from the `position` column.

---

## Fixing a typo

1. Open **Table Editor** and pick the table.
2. Find the row. Double-click the cell you want to change.
3. Make the edit and save.
4. Reload that lesson on the live site to see it.

That is the whole process for any wording change: a title, a summary, an objective's text.

---

## What you cannot change — on purpose

These are permanent, and the database will refuse to change them:

- A lesson's **`slug`** (for example `s1-stalls`)
- A stage's **`slug`** (for example `stage-1`)
- An objective's **`id`** (for example `s1-stalls.stall-any-airspeed`)

Student progress, tutor history, mastery records, and quiz cards all point at these. Changing one would quietly erase a student's record for it. If you try, you get an error explaining why; nothing is changed.

Everything else — titles, summaries, text, order — you can edit freely.

---

## Editing specific columns

**`sources` and `acs_areas`** are lists. In the Table Editor they look like `["PHAK","AIM"]`. Keep the square brackets, quotes, and commas. `sources` only accepts `PHAK`, `AFH`, `AIM`, and `14 CFR`; anything else is refused.

**`position`** sets lesson order within a stage, lowest first. To swap two lessons, change both numbers — two lessons can briefly share a number while you do it.

**`history_card_id`** must match a card id in `src/lib/instructor/history-cards.ts`, or be empty. An id that does not match simply shows no card. **Adding a new history card still needs code**, because history cards go through their own review.

**`is_safety_critical`** on an objective changes how the tutor treats a student who is shaky on it, and which quiz cards need CFI sign-off. Treat changing it as a CFI decision, not an edit.

---

## Undoing an edit

Every change is saved automatically. To see the recent edits to a lesson, run this in the **SQL Editor**, replacing the slug:

```sql
select edited_at, old_row, new_row from public.curriculum_edits where row_key = 's1-stalls' order by edited_at desc limit 5;
```

`old_row` is what it was before, and `new_row` is what it became. To undo, copy the old value back into the cell in the Table Editor. (Undoing is itself an edit, so it gets recorded too.)

For an objective, `row_key` is its id, such as `s1-stalls.stall-any-airspeed`.

---

## Bigger changes — ask first

These are possible in the Table Editor, but each has a consequence worth talking through before you do it:

- **Adding a lesson.** The new slug is permanent the moment you save, so choose it carefully. It also needs objectives, and **the dashboard currently lists lessons for Stage 1 only** — a lesson added to Stage 2 or 3 would not appear yet.
- **Adding an objective.** Its id is permanent, in the form `lesson-slug.short-fragment`.
- **Removing an objective.** Never delete one. Set its `retired_at` to the current time instead, so students' past records stay intact. Any quiz cards written against it need attention too.
- **Deleting a lesson or stage.** The database blocks deleting a lesson that still has objectives, and a stage that still has lessons.

---

## Never do these

- **Do not re-run migration `0010`.** It predates this and would overwrite your edits with old text.
- **Do not edit files in `supabase/migrations/`** to change lesson content. They are a record of how the database was built, not where content lives.
