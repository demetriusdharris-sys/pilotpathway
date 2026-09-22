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

## 8. Never frame a student's doubt about belonging as a defect.

A card must never present a student's doubt about whether aviation is for them as a personal failing, a safety risk, or a hazardous attitude. Not as the answer, not as a distractor, not as an aside in an explanation.

Our students arrive carrying real doubts about money, medicals, and whether people like them become pilots. Those doubts are a response to an industry that has historically not made room for them. They are not a symptom in the student, and a card that treats them as one tells a student that the thing they were already afraid of is now also a flaw the training has diagnosed in them.

Cultural grounding in this product is about access and examples — the tone, the history cards, the cost of entry, who appears in a scenario. It is never about diagnosing the student. FAA standards stay exactly where they are; what changes is who can see themselves meeting them.

**The worked example, from this repository.** An early draft of Card 9 in `s1-imsafe-pave.md` taught the hazardous attitude Resignation, and its explanation ended: *"a student who decides early that aviation is not really for people like them is closer to this one than to any of the others."*

Two things were wrong with it. First, it is a category error: the hazardous attitudes describe a pilot at the controls deciding they cannot affect what happens next, not a person weighing whether to start. Resignation is about the next thirty seconds of a flight. Second, and worse, it takes the exact doubt this product exists to answer and reclassifies it as a safety defect belonging to the student. A student who read that card and recognised themselves would learn that their hesitation is a hazard they carry.

The fix was to cut the clause and give a concrete in-flight example instead — a pilot who sees an approach going wrong, decides it is out of their hands, and rides it down instead of going around. Same attitude, correctly located.

If a card seems to need a line about belonging, it does not. Write the aviation.

---

## When a card fails one of these

Mark it and say which rule. "Cut this one" and "this needs a number confirmed" are both useful review outcomes. A flagged card costs a rewrite; a confidently wrong card about stalls costs something else.

Cards covering safety-critical objectives — see the `is_safety_critical` column of `learning_objectives` — do not reach a student without a CFI's sign-off, whatever the review queue looks like.

---

## Known gaps in current drafts

*Accurate as of Sep 17 2026. Remove entries as they are resolved.*

- **`s1-pitot-static-gyro.md` tests one blockage against one instrument at a time, on purpose (Sep 22 2026).** Pitot and static failure indications depend on whether the drain hole is blocked as well as the ram inlet, and on whether the aircraft is climbing or descending, so a card that tries to cover the matrix will be wrong for some case. Two questions are open for the CFI: whether the both-blocked pitot case belongs at pre-solo level, and whether naming a vacuum-driven attitude and heading indicator is right for the fleet these students fly.
- **`s1-engines-fuel.md` deliberately avoids the fuel-gauge card already in `s1-preflight.md` (Sep 22 2026)** and stays on quality, grade, and planning. Check both lessons before adding a fuel card to either.
- **`s1-four-forces.md` and `s1-stalls.md` cover neighbouring ground and must be read together (Sep 22 2026).** The four-forces cards stay on what a stall *is* — the critical angle, what the published stall speed assumes, what weight changes — while the stalls cards cover recognition, recovery and spins. The four-forces document says so in its opening and asks the CFI to cut rather than duplicate if any card still overlaps. Anyone adding cards to either lesson should check the other first.
- **`s1-airplane-parts.md` is freshly drafted and unreviewed (Sep 22 2026)**, with one value gap: the maximum flap extension speed, which belongs to the airplane rather than to airplanes in general.
- **`s1-airspace-intro.md` asks the reviewer a question the cards cannot answer for themselves (Sep 22 2026).** Its middle objective is "state the basic VFR weather minimums", which is a set of numbers — and rule 4 forbids printing numbers we are not certain of. The three cards therefore test the shape of the rules and leave every figure as a gap, and the document's opening asks the CFI to choose: supply the figures they teach, or rule that the objective is assessed from the chart and the regulation rather than from memory. Whoever picks this up next should not quietly fill the numbers in from a handbook.
- **`s1-radio.md` is freshly drafted and unreviewed (Sep 22 2026)**, with one open question: whether a quiz card should address composure on the radio at all, or leave it to the lesson text and the instructor.
- **`s1-preflight.md` and `s1-weather-intro.md` are freshly drafted and wholly unreviewed (Sep 22 2026).** Three open questions are on the cards themselves: how a pre-solo student should think about inoperative equipment, whether true-versus-magnetic wind belongs in a first weather lesson, and whether carburettor icing should sit with the weather lesson rather than the engine lesson. Two value gaps: the temperature and dew point spread worth watching, and the distance to keep from a thunderstorm.
- **`s1-regs-pic.md` and `s1-pattern.md` are freshly drafted and wholly unreviewed.** Three things in them are deliberately unfinished and asked about on the cards themselves: the typical traffic pattern altitude is left as a value gap, the student solo visibility and surface-reference limits are left out entirely, and no medical certificate class is named. Each is a question for the reviewing CFI, not an oversight to be filled in by whoever reads this next.

- **`s1-stalls.md`: the distractor-quality question behind the clustering is still open.** Its correct answers now sit across all four positions, so the document reads honestly and a reviewer's eye has nothing to anticipate. That fixed the reviewability, which is all rule 6 can fix. It did not establish that every distractor was written as a serious alternative rather than as filler arranged around an answer chosen first — reordering cannot tell you that, and neither can the author. Deciding it is what the CFI review is for. Until that review comes back, treat the distractors on those nine cards as unverified.
