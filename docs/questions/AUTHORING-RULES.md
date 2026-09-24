# Knowledge test question rules

Standing rules for anyone writing or reviewing practice test questions — staff, CFIs, or Claude. These are not style preferences. Each exists because breaking it produces a question that is wrong, that teaches the wrong thing, or that puts this project on the wrong side of a copyright line.

Read these before writing. Read them again before approving.

The lesson quiz cards have their own rules in `docs/cards/AUTHORING-RULES.md`, and most of them apply here too. This file covers what is different about a knowledge test question.

---

## 1. Every question is original work. Nothing is copied.

The FAA's active question bank is **private and unpublished**. The banks sold by Sheppard Air, Gleim, ASA and Sporty's are **copyrighted reconstructions** — someone's work, protected, and not ours to reuse. Neither is a source.

That means:

- Do not copy a question from any commercial prep product, in any form, however reworded.
- Do not reconstruct a question someone remembers from their test.
- Write from the underlying source — the FAA handbooks, the regulations, the AIM, the ACS — the way you would write a new exam.

**This is a legal hard line, not a preference.** A question that came from a copyrighted bank is a liability for Equity Engine, and it stays a liability after it is reworded.

The FAA's published sample questions and the Airman Knowledge Testing Supplement are public domain and may be used freely.

## 2. Three choices, not four.

The FAA knowledge test uses three. Writing four trains a habit that does not match test day, and it dilutes every distractor.

## 3. The ACS code is metadata. It is never shown to a student.

Every question carries an ACS code so tests can be stratified and a result can be reported the way an Airman Knowledge Test Report is. **The code never appears in the question, the choices, or the explanation.**

Codes are revision-specific. A student who repeats a stale one to a DPE pays for our mistake — the same reason the tutor cites Areas of Operation by name.

**You cannot invent one, and you do not have to remember them.** `docs/reference/acs-codes.json` holds every code in the FAA's Private Pilot ACS, generated from the document itself:

```
node scripts/build-acs-index.mjs
```

The importer refuses any code that index does not contain, and names the questions using it. **Regenerate the index when the ACS is revised** — that is also how you find out which of your questions are now keyed to something that no longer exists.

Where the ACS lists a sub-item that it does not separately code, file the question under the parent code rather than inventing a sub-letter.

## 4. The explanation covers all three choices.

Not just why the right answer is right. **Why each wrong one is wrong**, in a sentence each. A student who picked a distractor needs to know what was wrong with their reasoning, not simply that someone else's reasoning was better.

This is also the single best defence against a bad distractor: if you cannot write a sentence explaining why an option is wrong, it is not a real distractor.

## 4a. Never name a choice by its letter — not in the explanation, not in the stem.

Choice order is **shuffled for every attempt**, and the permutation is stored per answer. The letter a student sees is not the letter you wrote. "B is wrong because…" is therefore wrong itself for most attempts, and it is wrong in the worst possible place: the explanation shown after grading, to a student who got it wrong and is trying to work out why.

Describe the idea instead. "Treating an analysis as a forecast is how a pilot plans for weather that has already moved on" says which option it means without naming it, and reads better than a letter would.

**The importer refuses a question that breaks this.** The first 24 questions written for this bank all broke it — including the five written to prove the pipeline worked — which is why it is a check rather than a rule to remember. The check knows that "Class B is…" is correct aviation prose and leaves it alone.

## 5. No number you are not certain of. No exceptions for "it's in the handbook".

Airspeeds, distances, weather minimums, cloud clearances, weights, times. If it varies by aircraft, or you are not certain, write **`[CFI: confirm value]`** and leave the gap.

A question with a gap **cannot be approved**. That is deliberate: the gap is a question for the reviewer, and approving around it would put a placeholder in front of a student.

## 6. Figures are referenced with their supplement edition.

Figures come from the FAA Airman Knowledge Testing Supplement, which is public domain and is what the student is handed on test day. Reference the real figure number — **and record which supplement edition it came from**, because a figure number without an edition is unverifiable once the supplement revises.

## 7. Distractors are real misconceptions.

Identical to card rule 3. A wrong option earns its place by being something a student pilot actually believes. Filler teaches elimination, which is a test-taking skill rather than a flying one.

## 8. Say where it came from.

Every question records `source_note` — what you wrote it from, named, so the reviewing CFI checks one claim against one passage instead of reconstructing your reasoning. "PHAK, weather chapter, stability discussion" is enough. It is never shown to a student.

Fill in `authored_by` honestly, including when the author was an AI. If a funder or the FAA ever asks where the questions came from, the answer should be in the data rather than in somebody's memory.

## 9. Nothing reaches a student without a CFI's approval.

Everything imports as `draft`. A CFI moves rows to `cfi_approved` with their name against them.

**"Derived from FAA material" is not a substitute for review.** The derivation is exactly where the errors enter: a distractor that is true under some condition, an explanation right for one airplane and wrong in general, a stem with two defensible answers. None of those look wrong on the page.

Editing an approved question **automatically returns it to draft** and clears the reviewer — enforced by a database trigger, not by anyone remembering.

---

## The file format

One file per batch, named after what it covers, in `docs/questions/`. A batch is **one knowledge area, sized to what that area needs** — three times its slot count in `TEST_BLUEPRINT`, so weather's 8 slots want 24 questions and accident reporting's 1 wants 3. Not a scattering across the syllabus: a reviewer working through one area at a time is a reviewer who finishes.

**Vary which letter is correct.** It does not reach students — order is shuffled at serve time — but a reviewer reading twenty questions whose answer is always the first option stops reading the distractors, and the distractors are where the errors hide. The first draft of the weather batch had 22 of 24 on `A`.

**Do not write two questions on the same fact.** Eight of the weather area's questions are served per full test, so a duplicate can appear twice on one paper. Check the existing batch for the area before adding to it — the first weather batch and its companion each asked about dewpoint spread and about structural icing conditions before that was caught.

````markdown
# Questions — <knowledge area>, <what the batch covers>

**Knowledge area:** Aviation weather and weather services
**Authored by:** Claude (Opus 5), reviewed against the sources named per question

### Q1

**Key:** `PA.I.C.K1.q1`
**ACS code:** `PA.I.C.K1`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 2
**Source:** PHAK, aviation weather services chapter — METAR structure
**Figure:** Figure 12 · CT-8080-2H

**Question:** What does a METAR report?

**Choices:**

- **A.** Conditions observed at a station at a particular time
- **B.** Conditions forecast for the next 24 hours
- **C.** Conditions reported by a pilot in flight

**Correct:** `A`

**Explanation:** A METAR is an observation — what was measured at that station, at that time. B describes a TAF, which is a forecast for a period. C describes a pilot report, which comes from an aircraft rather than a station.
````

`Objective`, `Figure` and `Difficulty` are optional. Everything else is required, and the importer refuses a file that is missing any of it rather than importing something half-formed.

**`Key` is permanent.** It is what the sync matches on. Changing a key orphans the row and creates a second one; reusing a key for different content silently replaces a question a CFI approved.

---

## Running the pipeline

```
node scripts/import-questions.mjs
```

Reads every document, refuses on a malformed one, and writes `supabase/migrations/0027_sync_question_bank.sql`. Apply that in the SQL Editor. **Regenerate it; never hand-edit it** — the markdown is the source, and a hand edit is how the words a CFI signed and the rows a student answers drift apart.

Everything lands as `draft`. Approval happens separately, by a person.
