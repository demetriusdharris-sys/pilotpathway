# Questions — Aviation weather and weather services, products and meteorology

**Knowledge area:** Aviation weather and weather services
**Authored by:** Claude (Opus 5), written from the sources named per question

**Status: DRAFT. Not served to any student until a CFI approves each row.**

**19 questions.** With the 5 in `weather-observations-and-forecasts.md` this brings the weather area to 24 — three times its 8 slots in the test blueprint, which is the coverage a first release needs. Weather is the heaviest area on the test.

**Why some questions sit on a parent code.** The FAA's ACS groups several lettered items under one code rather than coding each: the document contains `PA.I.C.K3f` for clouds and then lists turbulence and thunderstorms beneath it with no codes of their own. Confirmed against `docs/reference/acs-codes.json` and against the PDF text itself — `PA.I.C.K3g` and `PA.I.C.K3h` appear nowhere in the document, at any spacing. Per rule 3 those questions are filed under the parent `PA.I.C.K3` rather than under an invented sub-letter.

**No explanation names an option by letter.** Choice order is shuffled for every attempt and the permutation is stored per answer, so the student's "B" is not the "B" written here. Each explanation therefore describes the wrong idea rather than labelling it — which reads better anyway, and is the only version that is still true after shuffling.

**Numbers are deliberately scarce.** Most of what a private pilot must know about weather is a relationship rather than a figure, and where a figure would have been needed the question asks the relationship instead. Nothing here carries a `[CFI: confirm value]` gap, so every question is approvable as it stands — but please read the explanations as closely as the stems. An explanation that is right in one condition and wrong in general is the failure these rules exist to catch, and it will not look wrong on the page.

---

### Q1

**Key:** `PA.I.C.K1.q1`
**ACS code:** `PA.I.C.K1`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 1
**Source:** AIM, preflight briefing sources — official versus supplemental weather information

**Question:** You check the weather on a popular flight app before a cross-country. What have you actually done?

**Choices:**

- **A.** Satisfied the requirement to obtain a preflight weather briefing
- **B.** Seen weather information, but not necessarily obtained it from an official source
- **C.** Received a forecast you are entitled to rely on for your route

**Correct:** `B`

**Explanation:** A commercial app displays weather, and it may display it well, but what makes a briefing official is the source behind it rather than the screen in front of you — some apps are qualified providers and some are not, and you are expected to know which you are using. Seeing information is not the same as getting a briefing that covers your route: an app that omits a NOTAM or an advisory has not told you what a briefing would. And nothing in a weather product entitles you to rely on it, because a forecast is a prediction rather than a promise, and the decision it informs stays yours.

---

### Q2

**Key:** `PA.I.C.K2b.q1`
**ACS code:** `PA.I.C.K2b`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, aviation weather services chapter — surface analysis chart

**Question:** A surface analysis chart shows fronts, pressure centres and station data. What is it telling you?

**Choices:**

- **A.** What the surface weather pattern was at a particular past time
- **B.** What the surface pattern is forecast to be by the time you arrive
- **C.** What conditions are along your route at your cruising altitude

**Correct:** `A`

**Explanation:** A surface analysis is an analysis — it draws the pattern from observations already taken, and it carries the time those observations were valid. It is not a forecast, and reading it as one is how a pilot plans for weather that has already moved on; a product that predicts a future pattern is a different chart. Nor does it describe your route at altitude: it covers the surface, and it covers a broad region rather than the air you will actually be flying through.

---

### Q3

**Key:** `PA.I.C.K2c.q1`
**ACS code:** `PA.I.C.K2c`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 2
**Source:** PHAK, aviation weather services chapter — TAF coverage and limitations

**Question:** A TAF for a nearby airport forecasts good conditions all afternoon. Your destination is a small field thirty miles away with no forecast of its own. How much does that TAF tell you?

**Choices:**

- **A.** It applies to any airport in the same forecast region
- **B.** It applies exactly, because TAFs are issued by region rather than by airport
- **C.** Less than it appears — a TAF describes the vicinity of its own airport

**Correct:** `C`

**Explanation:** A TAF is written for one specific airport and its immediate vicinity, so conditions tens of miles away can differ; terrain, water and local effects all break the assumption that nearby means similar. Forecast regions do exist, but they are a separate and far coarser product, and a TAF is not one of them. Nor are TAFs issued regionally — they are issued airport by airport, which is exactly why a small field without one leaves you inferring from its neighbour, and inferring is not the same as being told.

---

### Q4

**Key:** `PA.I.C.K2d.q1`
**ACS code:** `PA.I.C.K2d`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, aviation weather services chapter — Graphical Forecasts for Aviation

**Question:** What does the Graphical Forecasts for Aviation give you that a single METAR cannot?

**Choices:**

- **A.** Conditions across an area and across successive times, so you can see weather moving
- **B.** A more precise account of conditions than a station observation gives
- **C.** Enough information that you no longer need reports for individual airports

**Correct:** `A`

**Explanation:** The value of a graphical product is the pattern: an area shown at several times running, which is how you see whether something is building, moving toward you, or clearing. Precision is the station observation's strength instead — a graphical forecast spans a wide area and cannot be as exact about one field as an instrument sited there. And it certainly does not replace those reports: seeing the shape of the weather tells you nothing about the ceiling and visibility at the airport you intend to land at, which is the more dangerous of the two misreadings.

---

### Q5

**Key:** `PA.I.C.K2e.q1`
**ACS code:** `PA.I.C.K2e`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, aviation weather services chapter — winds and temperatures aloft forecast

**Question:** The winds and temperatures aloft forecast publishes figures for fixed levels, and you plan to cruise between two of them. What do you do?

**Choices:**

- **A.** Use the lower level, because wind is weaker closer to the ground
- **B.** Interpolate between the two levels that bracket your altitude
- **C.** Use whichever of the two gives the more favourable wind

**Correct:** `B`

**Explanation:** The forecast is published at fixed levels because it has to be published at some levels, and cruising between them is the normal case — so you estimate from the two either side. There is no rule that wind weakens with height; it frequently strengthens, which is much of the reason the forecast exists at all. And choosing the more favourable of the two is not planning but wishing: a fuel calculation built on a figure you had no reason to expect is a fuel calculation that can run out.

---

### Q6

**Key:** `PA.I.C.K2f.q1`
**ACS code:** `PA.I.C.K2f`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 2
**Source:** AIM, inflight aviation weather advisories — AIRMET and SIGMET distinction

**Question:** What is the practical difference between an AIRMET and a SIGMET?

**Choices:**

- **A.** The AIRMET covers en route weather and the SIGMET covers airport weather
- **B.** The AIRMET is advisory and the SIGMET restricts what you are cleared to do
- **C.** The AIRMET covers conditions hazardous particularly to light aircraft; the SIGMET, conditions hazardous to all aircraft

**Correct:** `C`

**Explanation:** The distinction is severity and who is endangered: one warns of conditions that matter most to smaller, slower, less equipped aeroplanes, the other of weather severe enough to threaten anything flying. Neither restricts a clearance — both inform a decision that stays with the pilot, and nothing in an advisory prohibits a flight. And neither is about a single airport: both concern conditions along routes and over areas, which is what separates them from a terminal forecast.

---

### Q7

**Key:** `PA.I.C.K3a.q1`
**ACS code:** `PA.I.C.K3a`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — atmospheric stability and its visible signs

**Question:** You take off into smooth air beneath layered grey cloud, with steady light rain and hazy visibility. What does that combination tell you about the air?

**Choices:**

- **A.** It is stable
- **B.** It is unstable
- **C.** Stability cannot be judged from what you can see

**Correct:** `A`

**Explanation:** Stable air resists vertical motion, and every one of those signs follows from that: cloud spreads sideways into layers instead of building upward, precipitation is steady rather than arriving in bursts, and haze stays trapped near the surface instead of being mixed away. Unstable air shows close to the opposite set — cumulus growing vertically, showers, turbulence, and often excellent visibility between the showers. And the idea that you cannot tell by looking is worth unlearning early: the sky is one of the most useful instruments you have, and an examiner will expect you to read it.

---

### Q8

**Key:** `PA.I.C.K3b.q1`
**ACS code:** `PA.I.C.K3b`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — low-level windshear on approach

**Question:** On short final your airspeed rises sharply for a moment, then falls away, and you find yourself low. What have you most likely flown through?

**Choices:**

- **A.** An airspeed indication error caused by rain
- **B.** Windshear, with a headwind that increased and was then lost
- **C.** A gust, needing no response beyond holding your attitude

**Correct:** `B`

**Explanation:** A gain followed by a loss is the classic shape of windshear on approach: the aeroplane meets an increasing headwind, that headwind then disappears, and the airspeed and the lift go with it, leaving you low and slow close to the ground. A gust is brief and roughly symmetric, so a sustained gain and then loss is a change in the air mass itself — and treating it as a gust is how an approach ends short of the runway. Rain does not produce that pattern either; and even were an indication suspect, the safe response that low is to go around rather than to reason about the instrument.

---

### Q9

**Key:** `PA.I.C.K3b.q2`
**ACS code:** `PA.I.C.K3b`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — mountain wave and rotor turbulence

**Question:** Strong wind is blowing across a ridge ahead of you. Smooth lens-shaped clouds sit above the crests, with ragged cloud churning below them. Where is the worst turbulence likely to be?

**Choices:**

- **A.** Below and downwind of the ridge, in and near the ragged cloud
- **B.** Inside the smooth lens-shaped clouds, which mark the strongest lift
- **C.** Upwind of the ridge, where the air is being forced to rise

**Correct:** `A`

**Explanation:** The ragged cloud is rotor, and rotor is the most violent part of a mountain wave — it forms beneath the wave crests on the downwind side, where the airflow has broken up. The lens-shaped cloud marks the wave itself, which is often strikingly smooth even while carrying powerful vertical currents; its hazard is the climb or descent it imposes on you, not roughness. The upwind side is generally where air rises comparatively smoothly, because the breakdown happens after the air has crossed the ridge — which is also why crossing from downwind deserves extra height.

---

### Q10

**Key:** `PA.I.C.K3c.q1`
**ACS code:** `PA.I.C.K3c`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — uneven surface heating and convective currents

**Question:** You fly the same local route on a still morning and again on a hot afternoon, and the afternoon flight is noticeably bumpier at the same altitude. Why?

**Choices:**

- **A.** The sun has heated different surfaces unevenly, setting up rising and sinking currents
- **B.** Warmer air is denser, so it transmits gusts more strongly
- **C.** The wind is always stronger in the afternoon

**Correct:** `A`

**Explanation:** The ground does not warm evenly — a ploughed field, a car park and a lake all heat at different rates — and the air above each rises or sinks accordingly, so you fly through a patchwork of currents rather than a uniform mass. Warm air is in fact less dense, not more, which is the opposite of the reasoning offered and also why performance suffers on a hot day. And while afternoon wind often does freshen, the bumpiness here is convective: it appears on still days too, which is precisely what distinguishes it from wind.

---

### Q11

**Key:** `PA.I.C.K3d.q2`
**ACS code:** `PA.I.C.K3d`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — dewpoint as a measure of moisture

**Question:** What does the dewpoint tell you?

**Choices:**

- **A.** How much moisture that air is capable of holding
- **B.** The temperature at which that air would become saturated if it were cooled
- **C.** The relative humidity, expressed in degrees

**Correct:** `B`

**Explanation:** Dewpoint is a temperature, and it names the point at which the moisture already present would be enough to saturate the air — which is what makes it useful for anticipating cloud and fog. It is not a capacity: how much moisture air can hold depends on its temperature, and the dewpoint describes what is there rather than the ceiling on it. Nor is it humidity restated, because relative humidity is a percentage comparing what is present against that capacity — two air masses at the same relative humidity can have very different dewpoints and behave quite differently.

---

### Q12

**Key:** `PA.I.C.K3e.q1`
**ACS code:** `PA.I.C.K3e`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — cold and warm front characteristics

**Question:** A cold front and a warm front pass over the same airport on different days. How do the two spells of weather typically differ?

**Choices:**

- **A.** The cold front brings the longer spell, because cold air moves slowly
- **B.** They are much alike, since both are boundaries between air masses
- **C.** The cold front brings a shorter, more violent spell; the warm front a longer spell of low cloud and poor visibility

**Correct:** `C`

**Explanation:** A cold front undercuts warm air steeply and moves relatively quickly, so it lifts that air hard and is soon past — cumuliform cloud, showers, gusty wind, then clearing. A warm front rides up over cooler air on a shallow slope, so its cloud and precipitation stretch far ahead of it and linger. The claim that cold fronts are the slower of the two is wrong in both its conclusion and its reasoning: they generally move faster. And the two are not alike in any way that matters, because the shape of the boundary is what decides whether you face an hour of rough weather or a day of low ceilings.

---

### Q13

**Key:** `PA.I.C.K3f.q1`
**ACS code:** `PA.I.C.K3f`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 1
**Source:** PHAK, weather theory chapter — cloud form as an indicator of stability

**Question:** Cumulus clouds have been building steadily taller through the middle of the day. What should you expect on the climb?

**Choices:**

- **A.** Turbulence, because building cumulus marks rising air in unstable conditions
- **B.** Smooth air, because cumulus clouds are shallow
- **C.** Icing, because cumulus clouds always hold supercooled water

**Correct:** `A`

**Explanation:** Cumulus form means air is rising, and cumulus that keeps building means it goes on rising — so the air in and around them is in vertical motion, and you feel that as turbulence. Cumulus growing taller is by definition not shallow; their vertical development is the warning rather than a reason for comfort. And the icing claim asserts a certainty that does not hold: ice needs visible moisture and freezing temperatures together, so whether a particular cumulus threatens you depends on where its freezing level sits relative to your altitude.

---

### Q14

**Key:** `PA.I.C.K3.q2`
**ACS code:** `PA.I.C.K3`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — thunderstorm hazards, including hail carried from the anvil

**Question:** Why is the apparently clear air beneath and downwind of a thunderstorm's spreading anvil a poor place to fly?

**Choices:**

- **A.** It is acceptable, because the hazards stay inside the visible cloud
- **B.** Hail can be thrown out of the storm and fall through air that looks clear
- **C.** The only hazard there is reduced visibility

**Correct:** `B`

**Explanation:** A thunderstorm's hazards are not bounded by its cloud: hail can be carried out of the upper part of the storm and fall well clear of anything you can see, and the anvil shows you which way it is being carried. The belief that hazards stop at the cloud edge is worth losing early — turbulence, hail and severe downdraughts all reach beyond it, which is why avoidance is measured in miles rather than by clearing the visible cloud. And visibility is the least of what is present there; what is present can damage an airframe.

---

### Q15

**Key:** `PA.I.C.K3.q3`
**ACS code:** `PA.I.C.K3`
**Objective:** `s1-weather-intro.weather-drivers`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — flight in turbulence and the reason for reducing speed

**Question:** You meet turbulence rough enough to be throwing the aeroplane about. Why does slowing down help?

**Choices:**

- **A.** A lower speed weakens the gusts the aeroplane meets
- **B.** A lower speed lets the autopilot hold altitude more accurately
- **C.** At a lower speed a sharp gust stalls the wing before the structure can be overloaded

**Correct:** `C`

**Explanation:** Slowing down works because of what happens at the limit: below a certain speed the wing reaches its stalling angle under a sharp gust and gives way, relieving the load, instead of the structure absorbing it. That speed depends on the aeroplane and its weight, which is why it is a figure to take from the flight manual rather than from memory. Nothing you do changes the air itself — your speed changes only how you meet it. And the autopilot answer misplaces the concern entirely: the reason to slow in turbulence is structural, and holding altitude precisely is not the priority in rough air.

---

### Q16

**Key:** `PA.I.C.K3i.q2`
**ACS code:** `PA.I.C.K3i`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — freezing rain and the temperature structure above it

**Question:** You are in cruise below cloud when rain begins to strike the airframe and freeze on it. What does that tell you about the air above you?

**Choices:**

- **A.** It is colder above, which is what froze the drops
- **B.** There is a layer above you that is warmer than freezing
- **C.** Nothing about the air above — freezing rain forms where it falls

**Correct:** `B`

**Explanation:** Rain has to fall as liquid before it can freeze on contact, and it cannot have started as liquid in air below freezing — so somewhere above you there is a layer warm enough to have melted it, with colder air beneath that chilled the drops without refreezing them. That makes climbing a very different proposition from descending, which is the practical reason this matters. Assuming it is colder above gets the structure exactly backwards. And the idea that it forms where it falls misses the point: freezing rain is evidence about air you are not in, which is unusual and worth having.

---

### Q17

**Key:** `PA.I.C.K3j.q1`
**ACS code:** `PA.I.C.K3j`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 2
**Source:** PHAK, weather theory chapter — radiation fog and advection fog

**Question:** A clear, calm night follows a damp day, and by dawn the airport is fogged in. What has most likely happened?

**Choices:**

- **A.** Warm moist air moved in over a cooler surface
- **B.** A front passed through during the night
- **C.** The ground cooled overnight and chilled the moist air resting on it to saturation

**Correct:** `C`

**Explanation:** Clear skies let the ground radiate its heat away, calm air lets the layer just above it cool with the surface instead of being mixed, and already damp air has little cooling to do before it saturates — those three together are what produce fog by morning. Air moving in from elsewhere describes a different fog, the coastal kind, and it cannot be the answer on a calm night because it needs wind to arrive. A front is ruled out by the same evidence: it would have brought cloud and wind with it, and the night was clear and still.

---

### Q18

**Key:** `PA.I.C.K3l.q1`
**ACS code:** `PA.I.C.K3l`
**Objective:** `s1-weather-intro.fog-storms-icing`
**Difficulty:** 3
**Source:** PHAK, weather theory chapter — obstructions to visibility and slant range

**Question:** The reported visibility at your destination is comfortable, but there is haze. In the cruise you could see a long way ahead, yet on the approach you can barely pick out the runway. Why?

**Choices:**

- **A.** The report must have been wrong
- **B.** Looking down through a haze layer at a shallow angle puts far more of it between you and the runway
- **C.** Haze affects the ground observer's view rather than the pilot's

**Correct:** `B`

**Explanation:** Reported visibility is measured horizontally at the surface, while on approach you are looking through the layer at a slant — a much longer path through the haze, which is why a runway can be hard to find when the figure sounded generous. The report can be entirely accurate; it simply answers a different question from the one you are asking on final. And the last option has it inverted: the observer looking horizontally often has the better view, and the pilot descending through the layer the worse one.

---

### Q19

**Key:** `PA.I.C.R2b.q1`
**ACS code:** `PA.I.C.R2b`
**Objective:** `s1-weather-intro.metar-and-taf`
**Difficulty:** 2
**Source:** AIM, use and limitations of aviation weather reports and forecasts

**Question:** A forecast says your destination will stay above your personal minimums all afternoon. What is the honest way to use that?

**Choices:**

- **A.** As settled, since a forecast inside your minimums is what those minimums are for
- **B.** As a prediction that can be wrong, which is why you plan an alternative anyway
- **C.** As grounds to relax your minimums, since the margin is forecast to hold

**Correct:** `B`

**Explanation:** A forecast states what is expected, with real uncertainty attached, so the useful question is not whether it clears your minimums but what you will do if it turns out wrong — which is what an alternative and a fuel reserve answer. Treating it as settled confuses a prediction with an observation, and a favourable forecast is exactly when a pilot is most likely to stop planning. Relaxing the minimums is the more dangerous error of the two: minimums exist to absorb forecast error, so spending them because the forecast looks good removes the margin at the moment you were relying on it.
