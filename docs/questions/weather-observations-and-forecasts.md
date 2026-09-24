# Questions — Aviation weather and weather services, observations and forecasts

**Knowledge area:** Aviation weather and weather services
**Authored by:** Claude (Opus 5), written from the sources named per question

**Status: DRAFT. Not served to any student until a CFI approves each row.**

**Batch of 5, not 20 — this exists to prove the pipeline works end to end.** A real batch is twenty questions on one ACS code, per the authoring rules.

**ACS codes are real**, taken from `docs/reference/acs-codes.json`, which is generated from the FAA's own Private Pilot ACS. The importer refuses any code that document does not contain.

Q5 is filed under the parent code `PA.I.C.K3` rather than a sub-letter: the ACS lists thunderstorms as a sub-item of that element, but not every sub-item is separately tagged in the document, and a made-up sub-code would defeat the point of checking.

---

### Q1

**Key:** `PA.I.C.K2a.q1`
**ACS code:** `PA.I.C.K2a`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 1
**Source:** PHAK, aviation weather services chapter — METAR versus TAF

**Question:** What does a METAR tell you?

**Choices:**

- **A.** Conditions that were observed at a station at a particular time
- **B.** Conditions forecast for an airport over a coming period
- **C.** Conditions reported by a pilot from the air

**Correct:** `A`

**Explanation:** A METAR is an observation — what was measured, where, and when. B describes a TAF, which is a forecast covering a period around an airport. C describes a pilot report, which comes from an aircraft rather than a reporting station. The distinction matters because only one of the three can be wrong about the future.

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
- **B.** Both are magnetic, so they always agree
- **C.** The written report is referenced to the runway in use

**Correct:** `A`

**Explanation:** Written reports give wind direction relative to true north, while a tower or ATIS speaks it relative to magnetic north — the same reference runways are numbered in. B is wrong because the two references genuinely differ, which is why a runway chosen from a written report can surprise you. C is wrong because no weather report is referenced to a runway; runway selection is something you work out from the wind, not something the report does for you.

---

### Q3

**Key:** `PA.I.C.K3d.q1`
**ACS code:** `PA.I.C.K3d`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — temperature, dew point and condensation

**Question:** Through the afternoon the temperature and the dew point move closer together. What does that suggest?

**Choices:**

- **A.** The air is drying out
- **B.** Visible moisture is becoming more likely
- **C.** The wind is about to strengthen

**Correct:** `B`

**Explanation:** The dew point is the temperature at which air can hold no more water vapour, so a narrowing spread means the air is closer to giving that moisture up as cloud, mist or fog. A is backwards: a narrowing spread means the opposite of drying. C is unrelated — wind comes from pressure differences, not from the spread.

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

**Explanation:** Structural ice needs both at once: something to freeze, and cold enough for it to freeze on the airframe. A is wrong because cold clear air leaves nothing to accumulate. B is wrong because cloud well above freezing does not ice an aircraft. The pair is what makes icing forecastable rather than a surprise.

---

### Q5

**Key:** `PA.I.C.K3.q1`
**ACS code:** `PA.I.C.K3`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — thunderstorm formation requirements

**Question:** Which combination is required for a thunderstorm to form?

**Choices:**

- **A.** Moisture, unstable air, and a lifting action
- **B.** Cold air, high pressure, and strong surface wind
- **C.** Rain already falling, high humidity, and darkness

**Correct:** `A`

**Explanation:** All three ingredients must be present: water vapour to work with, air that keeps rising once started, and something to start it — heating, terrain or a front. B describes conditions more typical of a clear, stable day. C confuses a consequence with a cause: rain is something a storm produces, not something it needs to begin.
