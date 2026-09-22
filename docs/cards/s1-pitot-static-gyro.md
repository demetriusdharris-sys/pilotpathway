# Quiz cards for review — Stage 1, "Flight instruments you will live by"

**Lesson:** `s1-pitot-static-gyro` · **ACS area of operation:** Preflight Preparation · **Sources drawn on:** PHAK

**Status: DRAFT. Not shown to any student until a CFI signs off.**

## What we are asking you to do

Nine cards, three for each of the lesson's three learning objectives. None is marked safety-critical in our system, though the failure cards are where a student first learns that an instrument can lie to them.

**Where we were most careful.** Blocked pitot and static failures are easy to state backwards, and the behaviour depends on details — whether the drain hole is blocked as well as the ram inlet, whether the aircraft is climbing or descending. So each card here tests **one blockage and one instrument**, rather than the whole matrix at once. If you think a card is true only for a particular combination, say so and we will narrow its wording.

Please also check:

1. **Is it accurate for a typical trainer?** Which instruments are vacuum-driven and which are electric varies between airplanes, and we have tried not to state one fleet's layout as a general rule.
2. **Are the wrong answers realistic?**
3. **What should be cut?**

Markers in the text: **`[CFI: confirm value]`** is a number we would not guess. **`FLAG FOR CFI:`** is a specific doubt of ours, written down.

No section numbers, ACS task codes, or figure numbers appear anywhere. Sources are named only.

## About the A–D letters

**The options are shuffled every time a card is shown to a student.** The letters here are display only. Each option carries a stable id, `opt-1` to `opt-4`, and **Correct answer** names that id rather than a letter. Never write an option that refers to another by letter, and there is no "all of the above" or "none of the above".

The ids do not run in alphabetical order down a card. An option keeps its id when the options are reordered.

There is a blank **CFI review** line at the end of every card.

---

## Objective 1 — `s1-pitot-static-gyro.instrument-groups`

> Identify which instruments are pitot-static and which are gyroscopic

### Card 1 — Sorting the six

**Objective ID:** `s1-pitot-static-gyro.instrument-groups`

**Question:** Which three instruments work from the pitot-static system?

**Options:**

- **A.** (`opt-4`) Attitude indicator, heading indicator, turn coordinator
- **B.** (`opt-1`) Altimeter, attitude indicator, tachometer
- **C.** (`opt-2`) Airspeed indicator, altimeter, vertical speed indicator
- **D.** (`opt-3`) Airspeed indicator, turn coordinator, magnetic compass

**Correct answer:** `opt-2`

**Explanation:** The pitot-static three run on air pressure: the airspeed indicator compares ram air against static, while the altimeter and vertical speed indicator use static alone. The other three are gyroscopic. Sorting them this way is what lets you work out, in flight, which instruments a single failure has taken from you and which ones you can still trust. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** The six instruments drawn in their usual arrangement, with the pitot-static three connected by plumbing lines back to a pitot tube and a static port, and the other three left unconnected in the same picture.

**CFI review:** ______________________________________________

### Card 2 — When the gyros lose their drive

**Objective ID:** `s1-pitot-static-gyro.instrument-groups`

**Question:** The vacuum system fails in a trainer whose attitude and heading indicators are vacuum-driven. What happens?

**Options:**

- **A.** (`opt-3`) Those two instruments become unreliable, while the airspeed indicator, altimeter and vertical speed indicator keep working
- **B.** (`opt-1`) Every instrument on the panel stops at once
- **C.** (`opt-4`) Only the altimeter is affected
- **D.** (`opt-2`) Nothing changes until the engine is shut down

**Correct answer:** `opt-3`

**Explanation:** A vacuum failure takes the instruments that system spins and leaves the pressure instruments alone. The catch is that a dying gyro does not go blank — it drifts, leans, and keeps presenting a picture that looks plausible, which is why the vacuum gauge and a cross-check against other instruments matter. **Which instruments are vacuum-driven and which are electric differs between airplanes**, including between two of the same model. Confirm in the Pilot's Handbook of Aeronautical Knowledge and the POH or AFM for your airplane.

**Visual:** The six-pack with two instruments shaded to show they are affected, and a small vacuum gauge drawn to one side with its needle out of the normal range. The affected instruments still show a picture, drawn slightly askew rather than blank.

**FLAG FOR CFI:** We wrote this card for a vacuum-driven attitude and heading indicator because that is the common trainer layout, and said in the explanation that it varies. Please tell us whether that is the right call for the fleet your students fly, or whether the card should name no system at all and simply ask what a gyro failure looks like.

**CFI review:** ______________________________________________

### Card 3 — The one that needs nothing

**Objective ID:** `s1-pitot-static-gyro.instrument-groups`

**Question:** Which instrument keeps giving you useful information with no electrical power, no vacuum, and a blocked pitot-static system?

**Options:**

- **A.** (`opt-1`) The vertical speed indicator
- **B.** (`opt-4`) The heading indicator
- **C.** (`opt-3`) The turn coordinator
- **D.** (`opt-2`) The magnetic compass

**Correct answer:** `opt-2`

**Explanation:** The magnetic compass needs nothing but the earth's magnetic field. It is also awkward — it swings in turns, leads and lags depending on which way you are heading, and settles only in steady flight — but it is the one direction reference that no system failure can take away from you. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** A panel drawn with every instrument greyed out except the compass at the top of the windscreen, which is drawn normally. No dramatic lighting — just the contrast.

**CFI review:** ______________________________________________

---

## Objective 2 — `s1-pitot-static-gyro.blocked-pitot-static`

> Describe the indications of a blocked pitot tube and a blocked static port

### Card 4 — Ice on the pitot tube

**Objective ID:** `s1-pitot-static-gyro.blocked-pitot-static`

**Question:** The pitot tube's ram air inlet becomes blocked while the drain hole stays open. What does the airspeed indicator do?

**Options:**

- **A.** (`opt-2`) It freezes at the speed it was showing
- **B.** (`opt-1`) It falls toward zero as the trapped pressure drains away
- **C.** (`opt-4`) It reads higher and higher
- **D.** (`opt-3`) It is unaffected, since it reads from the static port

**Correct answer:** `opt-1`

**Explanation:** With the ram inlet blocked and the drain still open, the pressure the airspeed indicator depends on leaks away and the needle drops toward zero — while the airplane carries on flying at exactly the speed it was. What the instrument does next depends on whether the drain is blocked too, which is why this card asks about one case only. The response is the same either way: fly the attitude and the power setting you know, and do not chase the needle. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** A pitot tube in cross-section with the front inlet iced over and the drain hole open, an arrow showing pressure escaping, and the airspeed needle drawn falling while the airplane beside it flies level and unchanged.

**FLAG FOR CFI:** We have deliberately not written the case where the ram inlet *and* the drain are both blocked, where the indicator behaves like an altimeter as the airplane climbs or descends. Please tell us whether a pre-solo student should meet that case here, or whether it belongs later.

**CFI review:** ______________________________________________

### Card 5 — The static port blocks

**Objective ID:** `s1-pitot-static-gyro.blocked-pitot-static`

**Question:** The static port becomes blocked in the climb. What does the altimeter do?

**Options:**

- **A.** (`opt-3`) It reads the correct altitude but responds slowly
- **B.** (`opt-4`) It winds down toward zero
- **C.** (`opt-1`) It stops changing, holding the altitude where the blockage happened
- **D.** (`opt-2`) It is unaffected, since it works from the pitot tube

**Correct answer:** `opt-1`

**Explanation:** The altimeter measures the static pressure it is fed, so if that pressure is sealed in, the reading stops moving — and keeps showing an altitude you left behind. The vertical speed indicator goes quiet for the same reason. An altimeter that will not move while the airplane is climbing is the clue. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** A climbing airplane drawn at three heights with the altimeter beside it showing the same reading in all three, and the static port marked as sealed.

**CFI review:** ______________________________________________

### Card 6 — What you do about it

**Objective ID:** `s1-pitot-static-gyro.blocked-pitot-static`

**Question:** You suspect the static system is blocked. What does your airplane give you to deal with it?

**Options:**

- **A.** (`opt-4`) An alternate static source, if one is fitted — selected as your airplane's checklist directs
- **B.** (`opt-2`) A switch that heats the static port until the blockage clears
- **C.** (`opt-1`) Nothing — the flight must be continued on the affected instruments
- **D.** (`opt-3`) A second altimeter fed from a separate port

**Correct answer:** `opt-4`

**Explanation:** Many airplanes have an alternate static source, often drawing from inside the cabin, which restores the static instruments with a small error because cabin pressure is not quite the same as outside. Your checklist says whether you have one, how to select it, and what correction to expect: `[CFI: confirm value]`. Pitot heat is a different thing, and it heats the pitot tube rather than the static port. Confirm in the Pilot's Handbook of Aeronautical Knowledge and the POH or AFM for your airplane.

**Visual:** A cockpit panel with the alternate static source control called out, and a small inset comparing the altimeter reading on the normal and alternate sources with the difference marked but not numbered.

**CFI review:** ______________________________________________

---

## Objective 3 — `s1-pitot-static-gyro.six-pack-readings`

> Explain what each instrument in the primary group tells you

### Card 7 — Rate, not position

**Objective ID:** `s1-pitot-static-gyro.six-pack-readings`

**Question:** What does the vertical speed indicator tell you?

**Options:**

- **A.** (`opt-2`) Your height above the ground
- **B.** (`opt-1`) Your altitude above sea level
- **C.** (`opt-3`) The angle of your climb in degrees
- **D.** (`opt-4`) How fast your altitude is changing — and it takes a moment to settle after you change something

**Correct answer:** `opt-4`

**Explanation:** The vertical speed indicator reports a rate of change, not a position, and it lags: it needs a moment after a pitch change before its reading means anything. That is why it is used to confirm a trend rather than to chase, and why a student who flies the vertical speed indicator ends up oscillating up and down through their altitude. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** A pitch change drawn on a timeline with the altimeter starting to move immediately and the vertical speed needle catching up a moment later, the delay marked between the two traces.

**CFI review:** ______________________________________________

### Card 8 — What the turn coordinator is actually showing

**Objective ID:** `s1-pitot-static-gyro.six-pack-readings`

**Question:** What does the turn coordinator show you?

**Options:**

- **A.** (`opt-3`) The exact bank angle of the wings, in degrees
- **B.** (`opt-1`) The rate at which the airplane is turning, with the ball showing whether the turn is coordinated
- **C.** (`opt-4`) The rate of climb during a turn
- **D.** (`opt-2`) The heading you will roll out on

**Correct answer:** `opt-1`

**Explanation:** The little airplane shows how fast your heading is changing, not the precise angle of bank — two different airplanes at the same rate of turn can be banked differently. The ball is a separate thing entirely: it tells you whether your feet and hands agree, and a ball out to one side in a turn is the condition that turns a stall into a spin. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** The instrument drawn twice at the same indicated rate of turn, with two different bank angles sketched beside it, and the ball shown centred in one and displaced in the other.

**CFI review:** ______________________________________________

### Card 9 — The heading indicator drifts

**Objective ID:** `s1-pitot-static-gyro.six-pack-readings`

**Question:** Why does the heading indicator need to be reset against the magnetic compass during a flight?

**Options:**

- **A.** (`opt-1`) Because it loses electrical power periodically
- **B.** (`opt-2`) Because it re-aligns itself only on the ground
- **C.** (`opt-3`) Because magnetic north moves during a flight
- **D.** (`opt-4`) Because it drifts over time and no longer agrees with the compass

**Correct answer:** `opt-4`

**Explanation:** A gyro holds a direction rather than seeking one, and small forces and the earth's own rotation make it wander. So it is set against the compass — in steady, straight, unaccelerated flight, because that is the only time the compass is telling the truth — and reset at intervals during the flight. How often is a habit your instructor will give you: `[CFI: confirm value]`. Confirm in the Pilot's Handbook of Aeronautical Knowledge.

**Visual:** A heading indicator and a magnetic compass side by side at two points in a flight, agreeing in the first and differing slightly in the second, with a small adjustment knob drawn beneath the heading indicator.

**CFI review:** ______________________________________________

---

## Reviewer sign-off

Your name goes on record against every card you approve, with the date. Approving some and cutting others is a normal outcome. No card without your approval is shown to a student.

**Name:** ______________________________________________

**Certificate number and type:** ______________________________________________

**Date:** ______________________________________________
