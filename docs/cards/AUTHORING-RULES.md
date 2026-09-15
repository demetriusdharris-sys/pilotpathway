# Card authoring rules

Standing rules for anyone drafting or reviewing quiz cards — staff, CFIs, or Claude. These are not style preferences. Each one exists because breaking it produces a card that is wrong, that teaches the wrong thing, or that quietly stops working once the card reaches a student.

Read these before writing a card. Read them again before approving one.

---

## 1. The options are shuffled. Write as if the order is random, because it is.

Every card's options are reordered each time a student sees them. The A–D letters in a source document exist only so humans can talk about the options; a student never sees that order.

Two consequences, both absolute:

- **No option may refer to another by position.** "Both A and B." "Same as C, but with flaps." "Either A or D." Each of these becomes gibberish the moment the order changes. If two options genuinely need to relate to each other, say it in words that survive being moved.
- **No "all of the above" and no "none of the above."** They depend on there being an above. They are also weak questions on their own merits: a student who recognises one true option can reason to "all of the above" without knowing anything about the others, and score as though they did.

This extends to explanations and visual descriptions. An explanation that says "Option C is a different thing entirely" is broken for every student who sees that option in a different slot. Name the *content* — "the engine-roughness option" — or restate the idea.

## 2. The correct answer is named by option id, never by letter.

Each option carries a stable id, `opt-1` through `opt-4`, unique within its card. **Correct answer** names that id.

Ids do not change when options are reordered, reworded, or moved between drafts. Letters do. Review notes should use ids too — `opt-3` means the same thing tomorrow, after a reshuffle, and in the database.

## 3. Distractors must be real misconceptions, not filler.

A wrong option earns its place by being something a student pilot actually believes. "The engine loses power" is a good distractor for a question about aerodynamic stalls, because confusing the two is a mistake beginners genuinely make. "The wings fall off" is not a distractor; it is padding.

Filler options do measurable harm. They let a student reach the right answer by elimination, and what they then practise is test-taking, not flying. A card with one plausible distractor and two silly ones is a two-option card wearing a costume.

If you cannot think of three real misconceptions, write a three-option card. Three honest options beat four with one invented.

## 4. No specific numbers unless they are settled across all training aircraft.

Airspeeds, altitudes, distances, weather minimums, angles in degrees, percentages, rates — do not state one unless it is genuinely the same for every airplane a student might train in, and you are certain of it.

Where a number is aircraft-specific, or where you are not sure, write **`[CFI: confirm value]`** and leave the gap. A gap is a question someone can answer. A guessed number is a fact a student will carry into a cockpit or an oral exam.

This rule outranks making a card look finished. An incomplete card that is honest about what it does not know is a good outcome; a complete card with a confident wrong number is the outcome we are trying to prevent.

## 5. Sources are named, never numbered.

Cite the Pilot's Handbook of Aeronautical Knowledge, the Airplane Flying Handbook, the Aeronautical Information Manual, 14 CFR, or the Private Pilot Airplane ACS — **by name**.

Never a section number, an ACS task code, a chapter number, or a figure number. Those are revision-specific and easy to get subtly wrong, and a student who shows a DPE a stale code pays for our mistake. ACS Areas of Operation are referenced by name for the same reason.

If you are not certain a regulation says what you think it says, do not write it down. Say where to look it up instead.

## 6. Distribute the correct answers across positions in the source document.

Even though options are shuffled at render, the correct answers in the source must not cluster in one position.

This is a rule about the document, not about the student experience. A draft where eight of nine answers sit in slot two is hard for a reviewer to read honestly — the eye starts expecting the second option, and a reviewer who expects the answer stops evaluating the distractors. The distribution is a property of how reviewable the draft is.

It is also the cheapest available signal that the distractors were written as serious alternatives rather than as three things arranged around a predetermined answer.

## 7. Do not let a distractor construction become reliably wrong.

If "Yes — but only when X" is the wrong answer on card after card, students stop reading the sentence and start recognising the shape. They will score well and know nothing. The same goes for the longest option always being right, hedged options always being wrong, or absolute words like "always" and "never" always marking a distractor.

Vary the construction, and let a familiar shape be the correct answer sometimes. The pattern a student learns should be the aviation, not the card format.

---

## When a card fails one of these

Mark it and say which rule. "Cut this one" and "this needs a number confirmed" are both useful review outcomes. A flagged card costs a rewrite; a confidently wrong card about stalls costs something else.

Cards covering safety-critical objectives — see `isSafetyCritical` in `src/lib/curriculum.ts` — do not reach a student without a CFI's sign-off, whatever the review queue looks like.

---

## Known gaps in current drafts

*Accurate as of Sep 15 2026. Remove entries as they are resolved.*

- **`s1-stalls.md` violates rule 1 in two explanations.** Card 4 says "Option C is a different thing entirely" and Card 7 says "Option D is the instinct that gets people hurt." Both break under shuffling. Pending a decision on the wording, since the explanations are under CFI review.
- **`s1-stalls.md` violates rule 6.** Eight of its nine correct answers sit in the second position. Fixing it means reordering options, which has been deliberately deferred until the CFI review comes back, so that the reviewer sees the draft that was actually written.
