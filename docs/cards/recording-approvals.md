# Recording a CFI's review

What to do when a CFI sends the review packet back. Everything here is run in the **Supabase SQL Editor**.

**Nothing a student sees changes until you run one of these.** Every card sits at `draft` until a named reviewer approves it, and an approved card appears on its lesson page immediately afterwards.

---

## Before you start

Each card in the packet prints its **card id** in small grey type at the top right, like `s1-stalls.stall-any-airspeed.c1`. That id is what every command below uses. The big "Card 7" number is only for talking about it.

Write the reviewer's name the way they signed it, with their certificate number: `Jane Doe, CFI 1234567`. It is stored exactly as you type it and it is the record of who stands behind that card.

---

## Approving cards

**One card:**

```sql
update public.quiz_cards set status = 'approved', reviewed_by = 'Jane Doe, CFI 1234567', reviewed_at = now(), updated_at = now() where id = 's1-stalls.stall-any-airspeed.c1' returning id, status, reviewed_by, reviewed_at;
```

**Several at once** — add each id inside the brackets, in quotes, separated by commas:

```sql
update public.quiz_cards set status = 'approved', reviewed_by = 'Jane Doe, CFI 1234567', reviewed_at = now(), updated_at = now() where id in ('s1-stalls.stall-any-airspeed.c1', 's1-stalls.stall-any-airspeed.c2') returning id, status;
```

**You should see** one row back per card you approved. If you get fewer rows than ids you typed, one of the ids is wrong — check it against the packet.

---

## Cutting a card

A card the CFI says to cut is **retired**, not deleted. It stops reaching students, and the record that it existed stays.

```sql
update public.quiz_cards set status = 'retired', updated_at = now() where id = 's1-imsafe-pave.hazardous-attitudes.c9' returning id, status;
```

Also delete that card from its markdown file in `docs/cards/`, or the next import brings it back as a draft.

---

## Withdrawing an approval

If something turns out to be wrong after it went live:

```sql
update public.quiz_cards set status = 'draft', reviewed_by = null, reviewed_at = null, updated_at = now() where id = 's1-stalls.stall-any-airspeed.c1' returning id, status;
```

The card disappears from the lesson page straight away. Answers students already gave stay on record — they answered the card as it was reviewed at the time.

---

## When the CFI asks for a wording change

Do **not** edit the card in the database. The markdown in `docs/cards/` is the source, and an edit made only in the database is overwritten by the next import.

Instead, tell me what they want changed. The card gets fixed in the markdown, the migration and the review packet are regenerated, and the corrected card goes back for approval. This is deliberate: **an approval covers the words that were reviewed, not the card's id.** Changing a question, an option, or an explanation automatically knocks the card back to draft and clears the reviewer's name.

---

## Checking where things stand

**How many cards are in each state:**

```sql
select status, count(*) from public.quiz_cards group by status order by status;
```

**Which cards are live, and who approved them:**

```sql
select id, reviewed_by, reviewed_at from public.quiz_cards where status = 'approved' order by id;
```

**What a student would see on one lesson:**

```sql
select id, question from public.quiz_cards where lesson_slug = 's1-stalls' and status = 'approved' order by position;
```

Then open that lesson on the live site and check the quiz matches. No approved cards means no quiz appears at all — that is correct behaviour, not a bug.
