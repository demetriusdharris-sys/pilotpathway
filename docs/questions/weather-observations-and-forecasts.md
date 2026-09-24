# Questions — Aviation weather and weather services, observations and forecasts

**Knowledge area:** Aviation weather and weather services
**Authored by:** Claude (Opus 5), written from the sources named per question

**Status: DRAFT. Not served to any student until a CFI approves each row.**

**Batch of 5.** The companion file `aviation-weather-meteorology.md` carries 19 more, bringing the weather area to 24 — three times its 8 slots in the test blueprint.

**ACS codes are real**, taken from `docs/reference/acs-codes.json`, which is generated from the FAA's own Private Pilot ACS. The importer refuses any code that document does not contain.

Q5 is filed under the parent code `PA.I.C.K3` rather than a sub-letter: the ACS groups thunderstorms beneath another element's code rather than coding it separately, and inventing a sub-code would defeat the point of checking.

**No explanation names an option by letter.** Choice order is shuffled for every attempt and the permutation is stored per answer, so the student's "B" is not the "B" written here. An explanation that says "B is wrong" is therefore wrong itself for most attempts — these were written that way originally and have been rewritten to describe each wrong idea instead.

---

### Q1

**Key:** `PA.I.C.K2a.q1`
**ACS code:** `PA.I.C.K2a`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 1
**Source:** PHAK, aviation weather services chapter — METAR versus TAF

**Question:** What does a METAR tell you?

**Choices:**

- **A.** Conditions forecast for an airport over a coming period
- **B.** Conditions reported by a pilot from the air
- **C.** Conditions that were observed at a station at a particular time

**Correct:** `C`

**Explanation:** A METAR is an observation — what was measured, where, and when. A forecast covering a coming period at an airport is a TAF, a different product entirely, and the distinction matters because only one of the two can be wrong about the future. A report from an aircraft is a pilot report, which comes from someone flying rather than from a station on the ground, and carries all the imprecision of an eye at altitude.

---

### Q2

**Key:** `PA.I.C.K2a.q2`
**ACS code:** `PA.I.C.K2a`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 2
**Source:** AIM, wind direction reporting — true versus magnetic reference

**Question:** The wind in a written METAR and the wind a tower reads to you are referenced differently. How?

**Choices:**

- **A.** The written report uses true north; the spoken wind is magnetic
- **B.** Both are magnetic, so the two always agree
- **C.** The written report is referenced to the runway in use

**Correct:** `A`

**Explanation:** Written reports give wind direction relative to true north, while a tower or ATIS speaks it relative to magnetic north — the same reference runways are numbered in. The two genuinely differ, which is why a runway chosen from a written report can surprise you on arrival; assuming they agree is how that surprise happens. And no weather report is referenced to a runway: working out which runway the wind favours is your job, not something the report has done for you.

---

### Q3

**Key:** `PA.I.C.K3d.q1`
**ACS code:** `PA.I.C.K3d`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — temperature, dewpoint and condensation

**Question:** Through the afternoon the temperature and the dewpoint move closer together. What does that suggest?

**Choices:**

- **A.** The air is drying out
- **B.** Visible moisture is becoming more likely
- **C.** The wind is about to strengthen

**Correct:** `B`

**Explanation:** The spread between temperature and dewpoint measures how far the air is from saturation, so a narrowing spread means it is closer to giving that moisture up as cloud, mist or fog. Reading it as drying air has the relationship backwards — it is a widening spread that indicates drier air relative to its temperature. Wind is unrelated to the spread: it comes from pressure differences, and a narrowing spread says nothing about it either way.

---

### Q4

**Key:** `PA.I.C.K3i.q1`
**ACS code:** `PA.I.C.K3i`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — structural icing conditions

**Question:** What has to be present for structural ice to form on an airframe?

**Choices:**

- **A.** Freezing temperatures alone
- **B.** Visible moisture alone
- **C.** Visible moisture, and a temperature at or below freezing where the aircraft is flying

**Correct:** `C`

**Explanation:** Structural ice needs both at once: something to freeze, and cold enough for it to freeze on the airframe — and that pairing is what makes icing forecastable rather than a surprise. Cold clear air leaves nothing to accumulate, however far below freezing it is. Cloud well above freezing wets the aeroplane instead of icing it, which is why the freezing level matters as much as the cloud does.

---

### Q5

**Key:** `PA.I.C.K3.q1`
**ACS code:** `PA.I.C.K3`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — thunderstorm formation requirements

**Question:** Which combination is required for a thunderstorm to form?

**Choices:**

- **A.** Cold air, high pressure, and strong surface wind
- **B.** Moisture, unstable air, and a lifting action
- **C.** Rain already falling, high humidity, and darkness

**Correct:** `B`

**Explanation:** All three ingredients have to be present: water vapour to work with, air that keeps rising once it has started, and something to start it — surface heating, terrain, or a front. Cold air under high pressure with a strong surface wind describes a clear, stable day instead, which is close to the opposite set of conditions. And rain already falling confuses a consequence with a cause: rain is something a storm produces, not something it needs in order to begin, and darkness has nothing to do with it.
