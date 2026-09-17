-- 0015: sync quiz cards from docs/cards/*.md.
--
-- GENERATED FILE. Do not hand-edit it. Regenerate with:
--
--     node scripts/import-cards.mjs
--
-- The reviewed markdown is the source of truth. Hand-editing this file is how
-- the document a CFI signed and the rows a student sees drift apart.
--
-- Safe to re-run. Two things it will never do:
--
--   * It never approves a card. Everything arrives as 'draft'. Approval means
--     a CFI's name and the date written against the row, and that is a human
--     act, not something an import can perform.
--   * It never silently keeps an approval alive across a content change. If a
--     card's question, options, explanation or visual changed since the last
--     import, the card is knocked back to 'draft' and its reviewer cleared —
--     an approval covers the words that were reviewed, not the id.
--
-- Cards that have disappeared from the markdown are retired, not deleted, so
-- a cut card stops reaching students without erasing that it existed.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create temp table incoming_cards (
  id text primary key,
  objective_id text not null,
  lesson_slug text not null,
  position integer not null,
  question text not null,
  explanation text not null,
  visual_description text
);

insert into incoming_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description)
values
  ('s1-imsafe-pave.imsafe-checklist.c1', 's1-imsafe-pave.imsafe-checklist', 's1-imsafe-pave', 1, 'IMSAFE is a checklist you run on what?', 'Everything else you check before a flight is about the airplane or the conditions. IMSAFE is the one that looks at the pilot: **I**llness, **M**edication, **S**tress, **A**lcohol, **F**atigue, **E**motion. You may hear an instructor give the E as Eating — that version comes from other aviation authorities and some training groups rather than the FAA, so it is worth knowing it exists, but Emotion is the one we teach. It is the first real pilot decision of the day, and the only one nobody else can make for you. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'A split graphic. On the left, a preflight walkaround silhouette with a clipboard, labelled "everything else you check." On the right, the same pilot standing still with a hand on their own chest, labelled "IMSAFE." Six small tiles beneath the right-hand figure, one per letter, with the word spelled out. No airplane on the right-hand side at all — the absence is the point.'),
  ('s1-imsafe-pave.imsafe-checklist.c2', 's1-imsafe-pave.imsafe-checklist', 's1-imsafe-pave', 2, 'In IMSAFE, what does the S stand for?', 'Stress — money, school, family, a hard week — rides along in the cockpit whether or not you invite it, and it eats the attention you need for flying. Sleep is a genuinely easy one to land on, but sleep belongs to Fatigue, which has its own letter. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'The six IMSAFE letters shown as a vertical column with each expansion written out, and the S row highlighted. Beside the S row, three small icons — a phone with unread messages, a bill, a clock showing a late hour — drawn small and ordinary rather than dramatic. Beside the F row, a separate icon of a bed, drawn to make the Sleep-versus-Stress distinction visible at a glance.'),
  ('s1-imsafe-pave.imsafe-checklist.c3', 's1-imsafe-pave.imsafe-checklist', 's1-imsafe-pave', 3, 'You wake up with a heavy head cold on the morning of a lesson. What does IMSAFE ask you to weigh?', 'A cold is exactly what the I is for — blocked sinuses and ears hurt on the way down, and feeling rough dulls the judgment you are there to practise. Reaching for medication does not clear the checklist either; that is the M, and many over-the-counter remedies carry their own wait before flight — `[CFI: confirm value]`. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'A simple head-in-profile diagram showing the sinus cavities and the middle ear, with small pressure arrows on a descending flight path beside it. Underneath, two checklist rows side by side — Illness and Medication — with a line drawn between them and the caption "treating one lands you in the other."'),
  ('s1-imsafe-pave.pave-checklist.c1', 's1-imsafe-pave.pave-checklist', 's1-imsafe-pave', 1, 'PAVE sorts the risks of a flight into four areas. Which four?', 'PAVE gives you four places to look so that a risk does not go unnoticed simply because you were thinking about something else. Pilot is you, Aircraft is the machine, Environment is the weather, terrain, airport and time of day, and External pressures are the reasons you feel you have to go. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'Four quadrants of equal size, each labelled with its word and carrying one plain icon: a pilot''s head and shoulders; a small trainer aircraft; a cloud over a ridgeline with a moon; and a phone showing a waiting message. Equal weight given to all four quadrants, with no arrows or ranking between them.'),
  ('s1-imsafe-pave.pave-checklist.c2', 's1-imsafe-pave.pave-checklist', 's1-imsafe-pave', 2, 'You told friends you would be on the ground by a certain time, and they are waiting for you there. Where does that belong in PAVE?', 'A promise you have made to somebody else is a reason to keep going when you should turn back, and PAVE gives that its own letter precisely because it is so easy to miss — it is the only one of the four that is not about the flight at all. Recognising it is what stops it deciding for you. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'A pilot in the cockpit at the top of the frame with a thought bubble containing a clock and two waiting figures. The four PAVE quadrants sit below, with a dotted line running from the thought bubble past the Pilot quadrant and into External pressures, captioned "it feels like it is about you — it is not."'),
  ('s1-imsafe-pave.pave-checklist.c3', 's1-imsafe-pave.pave-checklist', 's1-imsafe-pave', 3, 'The flight is at night, into an airport with rising ground nearby. Which PAVE area covers the darkness and the terrain?', 'Environment is everything the flight happens in rather than everything you bring to it — weather, terrain, the airport itself, and the time of day. Darkness and rising ground are both squarely in that bucket. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Aeronautical Information Manual.', 'A night approach drawn in profile: an airplane on a descending path, a ridgeline rising beneath and ahead of it, an airport beacon on the far side of the ridge. Along the bottom, the four PAVE labels with Environment highlighted. The pilot figure is drawn outside the scene, off to one side, to keep the two ideas visually separate.'),
  ('s1-imsafe-pave.hazardous-attitudes.c1', 's1-imsafe-pave.hazardous-attitudes', 's1-imsafe-pave', 1, '"Those rules are for people who do not really know what they are doing." Which hazardous attitude is that?', 'Anti-authority is the attitude that the rules are somebody else''s problem. It is worth separating from Macho, which is about proving something, and from Invulnerability, which is about believing the bad outcome happens to other people. They can appear together in the same sentence, which is why naming them matters. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'A regulation page or a placarded limitation shown at an angle, with a hand pushing it aside. Beside it, the five attitude names listed plainly, with Anti-authority marked. No caricature of a pilot — the point is that this is a thought, not a personality.'),
  ('s1-imsafe-pave.hazardous-attitudes.c2', 's1-imsafe-pave.hazardous-attitudes', 's1-imsafe-pave', 2, 'Which thought is the antidote to Invulnerability?', 'Invulnerability is the belief that accidents happen to other people, so its antidote is the sentence that puts you back in the picture. Every option here is a real antidote to one of the five attitudes, which is the point — knowing the list is not the same as matching it. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'Five rows, each pairing an attitude with its antidote, laid out as a simple matching table with the Invulnerability row highlighted. The other four rows stay fully legible rather than greyed out, so the card teaches the whole set even while asking about one.'),
  ('s1-imsafe-pave.hazardous-attitudes.c3', 's1-imsafe-pave.hazardous-attitudes', 's1-imsafe-pave', 3, '"There is nothing I can do about it. Whatever happens, happens." Which hazardous attitude is that?', 'Resignation is the one that does not look like a hazardous attitude, because it sounds like modesty rather than risk-taking. It shows up as a pilot who stops trying to influence the outcome — one who sees an approach going wrong, decides it is out of their hands now, and rides it down instead of going around. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'A pair of hands coming off a control yoke, palms open. Beside it, an altimeter or a fuel gauge drawn mid-problem and unattended. Deliberately understated — no alarm colouring — because the card is about an attitude that does not announce itself.'),
  ('s1-pattern.pattern-legs.c1', 's1-pattern.pattern-legs', 's1-pattern', 1, 'You have flown past the end of the runway, turned toward it, and are descending — but you are not lined up with it yet. Which leg are you on?', 'Base is the leg between downwind and final, flown roughly at right angles to the runway, and it is where most of the descent and the last look for traffic happen. Final is the leg aligned with the runway. Getting the names right is not vocabulary for its own sake: on the radio, the leg you say is how everyone else builds a picture of where you are. Confirm in the Aeronautical Information Manual and the Airplane Flying Handbook.', 'A rectangular pattern drawn around a runway with each leg labelled, and a small airplane symbol placed on base. The other legs stay fully drawn and labelled rather than faded, so the whole shape is learned even while one leg is asked about.'),
  ('s1-pattern.pattern-legs.c2', 's1-pattern.pattern-legs', 's1-pattern', 2, 'At an airport with no published exceptions, which way do traffic pattern turns go?', 'Turns in the pattern are to the left unless right traffic is published for that runway — and where it is, it is shown in the Chart Supplement, on the sectional, and on the airport''s segmented circle. Checking before you arrive is the habit; guessing from the wind is how two aircraft end up circling in opposite directions. Confirm in the Aeronautical Information Manual and 14 CFR.', 'Two patterns drawn side by side around identical runways, one left and one right, with the direction of flight arrowed. Between them, a segmented circle with traffic pattern indicators, drawn as the thing that tells the two apart.'),
  ('s1-pattern.pattern-legs.c3', 's1-pattern.pattern-legs', 's1-pattern', 3, 'You are planning a flight to an airport you have not visited. How do you find out its traffic pattern altitude?', 'Pattern altitude is published per airport, and the Chart Supplement is where you look it up while still on the ground. Typical light-aircraft pattern altitude is often around `[CFI: confirm value]` above field elevation, but airports vary, and matching whoever is already there assumes they got it right. Confirm in the Aeronautical Information Manual and the Chart Supplement for that airport.', 'A side view showing field elevation, pattern altitude as a dashed line above it, and the gap between them labelled as height above the field rather than above sea level. Beside it, a Chart Supplement entry drawn with the relevant line highlighted and no numbers filled in.'),
  ('s1-pattern.right-of-way.c1', 's1-pattern.right-of-way', 's1-pattern', 1, 'Two aircraft are approaching the same runway to land. One is lower than the other. What do the rules say?', '14 CFR gives the right of way to the lower aircraft when two are approaching to land — and in the same breath forbids using that rule to cut in front of or overtake the aircraft on final. **A radio call is not a right of way**; it tells people where you are. Confirm in 14 CFR and the Aeronautical Information Manual.', 'A side view of a final approach with two airplanes at different heights on the same path, the lower one ahead. A dotted line shows the higher one attempting to descend and slot in ahead, with that path drawn as the thing the rule forbids.'),
  ('s1-pattern.right-of-way.c2', 's1-pattern.right-of-way', 's1-pattern', 2, 'You are converging with another airplane at about the same altitude, and it is off to your right. Neither of you is landing yet. Who gives way?', 'When aircraft of the same category are converging at about the same altitude, the aircraft to the other''s right has the right of way, so the airplane on your right keeps its course and you give way. Head-on is the different case: there, both aircraft alter course to the right. Seeing the other aircraft first is what lets you act early; it does not change who gives way. Confirm in 14 CFR.', 'A plan view of two airplanes converging at a shallow angle, with the right-hand one continuing straight and the left-hand one curving behind it. A separate small panel shows the head-on case with both aircraft turning to their own right.'),
  ('s1-pattern.right-of-way.c3', 's1-pattern.right-of-way', 's1-pattern', 3, 'You are in the pattern in a trainer and converging with a glider. Who has the right of way?', '14 CFR orders the categories so that the aircraft with the least ability to manoeuvre or go around comes first — a balloon, then a glider, then an airship, with airplanes and rotorcraft giving way to all of them. An aircraft in distress has the right of way over everything. The engine that makes you able to go around is exactly why the rule asks you to be the one who does. Confirm in 14 CFR.', 'A simple ordered row: balloon, glider, airship, airplane, drawn at the same size with an arrow beneath running from "gives way least" to "gives way most". An aircraft in distress is drawn set apart at the front of the row.'),
  ('s1-pattern.go-around.c1', 's1-pattern.go-around', 's1-pattern', 1, 'Which of these calls for a go-around?', 'A go-around is the answer to any approach that is not working out, whatever is making it not work — energy, alignment, a runway in doubt, an instruction, or a landing that bounces. The Airplane Flying Handbook treats it as a normal manoeuvre that every pilot practises, not an emergency and not a mark against you. Confirm in the Airplane Flying Handbook.', 'Four small approach sketches in a row — high, fast, off-centreline, and a runway with something still on it — each with the same climbing arrow drawn away from the runway. One response, four causes.'),
  ('s1-pattern.go-around.c2', 's1-pattern.go-around', 's1-pattern', 2, 'You are high and fast on final and telling yourself you can still salvage it. Why does the Airplane Flying Handbook press you to decide early?', 'The go-around itself does not get harder — your margins do. Deciding while you still have height and options is what makes it routine, and pressing on to "save" an approach is how a landing accident starts. Nobody has to approve it, and a go-around does not need reporting. Confirm in the Airplane Flying Handbook.', 'One approach path drawn with three decision points marked along it, and beside each a shrinking bar representing the height and time remaining. No crash imagery — the shrinking bar carries the point.'),
  ('s1-pattern.go-around.c3', 's1-pattern.go-around', 's1-pattern', 3, 'You have decided to go around. What happens first?', 'Power and a climbing attitude come first, and the configuration changes follow in stages as the airplane accelerates — flaps and gear on the schedule for your airplane, which is in its handbook, not in a general rule. Dumping all the flaps at once can cost you the lift you are relying on at low speed. The exact sequence and speeds are aircraft-specific: `[CFI: confirm value]`. Confirm in the Airplane Flying Handbook and the POH or AFM for your airplane.', 'Three frames along a shallow climb away from the runway: throttle forward and nose raised; flaps moving in a first stage; a stabilised climb with the runway offset to one side so it stays in view. Each frame labelled with the action rather than a speed.'),
  ('s1-regs-pic.pic-authority.c1', 's1-regs-pic.pic-authority', 's1-regs-pic', 1, 'Your instructor has endorsed you for solo flight. Today the wind is within every limit written on your endorsement, but stronger than anything you have handled alone. Who decides whether you fly?', '14 CFR makes the pilot in command directly responsible for, and the final authority as to, the operation of the aircraft. An endorsement sets an outer boundary; it does not oblige you to fly to it. **Legal and safe are two different questions**, and only one person answers the second one on the day. Confirm in 14 CFR and the Pilot''s Handbook of Aeronautical Knowledge.', 'A single cockpit seat drawn from behind, with three arrows pointing toward it labelled "instructor", "tower", "schedule" — and one arrow pointing outward from the seat to the runway, drawn heavier than the other three.'),
  ('s1-regs-pic.pic-authority.c2', 's1-regs-pic.pic-authority', 's1-regs-pic', 2, 'An in-flight emergency needs immediate action, and the only safe course would break a rule. What do the regulations allow?', '14 CFR allows the pilot in command to deviate from the rules to the extent required to meet an in-flight emergency that demands immediate action, and the Administrator may request a written report afterwards. The authority is real, it is bounded by what the emergency actually requires, and it is accountable after the fact. Confirm in 14 CFR.', 'A rule book drawn open, with a single page lifted aside just far enough for an airplane silhouette to pass through — the rest of the book still closed. A small form icon on the far side, captioned "afterwards, on request."'),
  ('s1-regs-pic.pic-authority.c3', 's1-regs-pic.pic-authority', 's1-regs-pic', 3, 'The maintenance log shows the airplane was signed off this morning, and the school''s dispatcher released it to you. On your walkaround you find something that does not look right. What is your responsibility?', 'Maintenance and the operator have their own responsibilities, but 14 CFR puts the determination that the aircraft is in condition for safe flight on the pilot in command. Nobody else is in the airplane when the decision matters. Saying "it is not going today" is a normal thing for a student to say, and a CFI would rather hear it than not. Confirm in 14 CFR and the Airplane Flying Handbook.', 'Two panels. Left, a logbook page with a signature. Right, a gloved hand at the airplane holding an item at eye level. An arrow runs from left to right and stops short of the airplane, with a small gap drawn deliberately between them.'),
  ('s1-regs-pic.student-limitations.c1', 's1-regs-pic.student-limitations', 's1-regs-pic', 1, 'Your cousin asks to ride along on your next solo flight, just to watch. What do the regulations say?', '14 CFR does not permit a student pilot to carry passengers, and no endorsement or permission changes that — it is a limit on the certificate itself. Solo means solo. The limitation ends when you hold a certificate that allows passengers, which is one of the things the private pilot certificate buys you. Confirm in 14 CFR.', 'A two-seat cockpit drawn from above with the right seat empty and the seatbelt fastened across it, as it would be for solo flight. No crossed-out figure, no scolding — just the empty seat.'),
  ('s1-regs-pic.student-limitations.c2', 's1-regs-pic.student-limitations', 's1-regs-pic', 2, 'A neighbour offers to cover your fuel if you fly a box of parts to an airport an hour away. Can you do it as a student pilot?', '14 CFR bars a student pilot from carrying property for compensation or hire and from acting as pilot in command for compensation or hire. Covering costs still counts as compensation, and "I was going anyway" does not change what the flight is. This is one of the first places where a favour and a commercial operation look the same from the outside. Confirm in 14 CFR.', 'A cardboard box on a passenger seat with a fuel receipt resting on top of it, drawn plainly. Beside it, a small scale, with the box on one side and the receipt on the other, balancing level.'),
  ('s1-regs-pic.student-limitations.c3', 's1-regs-pic.student-limitations', 's1-regs-pic', 3, 'What must be in place before a student pilot flies solo?', 'Solo flight rests on your instructor''s endorsements — for solo in that make and model, kept current, plus the specific endorsements a particular flight needs, such as a solo cross-country. Hours, the knowledge test, and a medical all have their place, but none of them is what authorises you to fly alone. This is also why an AI cannot endorse anyone: **the endorsement is a certificated instructor putting their certificate behind your readiness.** Confirm in 14 CFR and with your CFI.', 'A logbook page drawn open with an endorsement block and a signature, and a date circled. Beside it, a calendar with a currency window shaded, showing that the endorsement has a life span rather than being permanent.'),
  ('s1-regs-pic.required-documents.c1', 's1-regs-pic.required-documents', 's1-regs-pic', 1, 'Which set of documents belongs in the aircraft itself?', 'The aircraft carries its own paperwork: the airworthiness certificate, the registration, the operating limitations (the approved flight manual or placards), and weight and balance information. Maintenance records are kept, but not normally carried in the airplane. Many pilots remember the set with a mnemonic; the point of the card is the contents, not the letters. Confirm in 14 CFR and the Pilot''s Handbook of Aeronautical Knowledge.', 'A document pocket in the airplane drawn open, with four labelled edges showing. Separately, on the pilot''s lap, a wallet — the two kept visually apart to make the point that the two sets are different.'),
  ('s1-regs-pic.required-documents.c2', 's1-regs-pic.required-documents', 's1-regs-pic', 2, 'You are walking out to fly solo. What must you have with you personally?', 'For solo flight in an airplane you carry your student pilot certificate, an appropriate medical certificate, and photo identification. Your logbook matters too — it holds the endorsements that make the flight legal — and your instructor will tell you when it must be with you. Confirm in 14 CFR and with your CFI.', 'Three cards laid flat side by side, drawn at the same size and with no personal details filled in. Beneath them, a logbook drawn slightly apart, labelled "where the endorsements live."'),
  ('s1-regs-pic.required-documents.c3', 's1-regs-pic.required-documents', 's1-regs-pic', 3, 'Why is the airworthiness certificate displayed in the cabin rather than filed in a folder?', '14 CFR requires the airworthiness certificate to be displayed so that it is legible to passengers and crew — which is why you see it near the cabin entrance rather than in a folder. It does not need a signature before each flight, and it stays valid while the aircraft is maintained as required. Confirm in 14 CFR.', 'The cabin doorway of a trainer, with the certificate mounted flat and legible at eye height, drawn from the point of view of someone stepping in.'),
  ('s1-stalls.stall-any-airspeed.c1', 's1-stalls.stall-any-airspeed', 's1-stalls', 1, 'What makes a wing stall?', 'A stall is about the angle between the wing and the air coming at it — the **angle of attack** — not about speed. Past a certain angle, called the **critical angle of attack**, the air stops following the top of the wing and lift falls off. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Airplane Flying Handbook.', 'Side view of a wing with the relative wind drawn as arrows coming from ahead. A shaded angle between the wing''s chord line and that relative wind, labelled "angle of attack." Three frames: small angle with smooth attached airflow; larger angle, still attached; past the critical angle, with the airflow over the top breaking away into turbulent swirls. The airspeed reading stays identical in all three frames, to make the point that speed did not change anything.'),
  ('s1-stalls.stall-any-airspeed.c2', 's1-stalls.stall-any-airspeed', 's1-stalls', 2, 'You are in a steep turn, well above the speed you normally see a stall happen at. Can the wing stall?', 'Pulling back harder raises the angle of attack, and the wing does not care how fast it is going when it gets there. This is an **accelerated stall**. The speed at which it happens climbs as you pull harder — in a steep turn, by roughly `[CFI: confirm value]`. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Airplane Flying Handbook.', 'Split screen. Left, an airplane in level flight, wings level, angle-of-attack gauge low, airspeed needle mid-range. Right, the same airplane in a steep banked turn, airspeed needle in the same place, angle-of-attack gauge swung up into a red band. One line of text between them: "Same speed. Different angle."'),
  ('s1-stalls.stall-any-airspeed.c3', 's1-stalls.stall-any-airspeed', 's1-stalls', 3, 'Can a wing stall while the nose is pointed below the horizon?', 'Attitude is where the nose is pointing; angle of attack is how the wing meets the air. They are not the same thing, and a hard pull during a descent or a dive recovery can stall the wing with the nose well below the horizon. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Airplane Flying Handbook.', 'An airplane in a descent, nose clearly below the horizon line. Two arrows from the wing: one showing where the nose points, one showing the relative wind coming up from below and ahead. The angle between the wing and that relative wind is shaded and large. A caption points out that the horizon tells you attitude, not angle of attack.'),
  ('s1-stalls.stall-warning-signs.c1', 's1-stalls.stall-warning-signs', 's1-stalls', 1, 'Which of these usually shows up as you approach a stall?', 'With less airflow over the control surfaces, the controls go soft and sloppy before the wing quits — often along with a shudder through the airframe, called **buffet**. The engine-roughness option is a different thing entirely: an engine problem is not an aerodynamic stall. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Airplane Flying Handbook.', 'A short looping animation of a control yoke being moved side to side, with the airplane''s response drawn as a lagging, sluggish wing dip. Beside it, a simple "feel" meter sliding from "crisp" toward "mushy." Faint vibration lines around the airframe to suggest buffet. No numbers on screen.'),
  ('s1-stalls.stall-warning-signs.c2', 's1-stalls.stall-warning-signs', 's1-stalls', 2, 'The stall warning goes off. What does that mean?', 'The stall warning is an early warning, not a report of something that already happened — it triggers before the wing stalls, giving you room to act. How much room varies by aircraft: `[CFI: confirm value]`. Confirm in the Pilot''s Handbook of Aeronautical Knowledge, and in the POH or AFM for the specific airplane.', 'A single sliding scale, left to right: "flying normally" → "stall warning" → "critical angle of attack" → "stalled." A marker sits on the stall-warning band, with the gap between it and "stalled" shaded and labelled "your margin — varies by airplane." The gap is drawn without a number on it.'),
  ('s1-stalls.stall-warning-signs.c3', 's1-stalls.stall-warning-signs', 's1-stalls', 3, 'The airspeed indicator shows a comfortable number. Does that guarantee the wing is not about to stall?', 'The marked stall range on the dial assumes a particular set of conditions. Load the wing up in a turn or a pull-up and the wing can stall at a higher indicated speed. The instrument is not lying to you — it is answering a different question than the one that matters. Confirm in the Pilot''s Handbook of Aeronautical Knowledge.', 'An airspeed indicator with the needle steady in the green. Over it, a ghosted second marking showing the stall point shifting upward as a small bank-angle dial beside it increases. The needle never moves; the stall point slides up to meet it.'),
  ('s1-stalls.stall-recovery-spins.c1', 's1-stalls.stall-recovery-spins', 's1-stalls', 1, 'What is the first thing you do to recover from a stall?', 'Only reducing the angle of attack makes the wing fly again — everything else comes after. The pull-back-to-stop-the-descent option is the instinct that gets people hurt: pulling harder is exactly what deepens a stall. Power and wings-level follow, in the order your airplane''s procedure gives. Confirm in the Airplane Flying Handbook, and follow the POH or AFM for your airplane.', 'Three panels. First, the wing past its critical angle with separated airflow and a downward arrow. Second, the control column moving forward and the angle of attack visibly shrinking, airflow reattaching. Third, the airplane flying again with the nose coming back up. A caption under panel two: "This is the step that ends the stall."'),
  ('s1-stalls.stall-recovery-spins.c2', 's1-stalls.stall-recovery-spins', 's1-stalls', 2, 'What has to be happening for a stall to develop into a spin?', 'A spin needs two ingredients at once: a stalled wing, and yaw. One wing is more stalled than the other, and the airplane rolls and rotates — this is why coordinated flight matters so much near the stall. Bank angle alone does not cause it. Confirm in the Pilot''s Handbook of Aeronautical Knowledge and the Airplane Flying Handbook.', 'Two-ingredient graphic: one icon of a stalled wing, one icon of a yaw arrow around the vertical axis, joined by a plus sign, equalling a small rotating-airplane icon. Beside it, a rudder pedal and a slip-skid ball centred, captioned "keeping the ball centred is what keeps the second ingredient out."'),
  ('s1-stalls.stall-recovery-spins.c3', 's1-stalls.stall-recovery-spins', 's1-stalls', 3, 'Why is a spin most dangerous close to the ground?', 'Recovering costs height, and how much depends on the airplane and on how far the spin has developed: `[CFI: confirm value]`. That is the whole reason the traffic pattern is where stall and spin awareness matters most. Confirm in the Airplane Flying Handbook, and in the POH or AFM for the specific airplane.', 'A side-on altitude ribbon with an airplane entering a spin near the top and the recovery drawn as a shaded band of height consumed before level flight. The same band is then shown overlaid at traffic-pattern height, where it reaches the ground. The band is shaded without a figure printed on it.');

create temp table incoming_options (
  card_id text not null,
  option_id text not null,
  text text not null,
  is_correct boolean not null,
  primary key (card_id, option_id)
);

insert into incoming_options (card_id, option_id, text, is_correct)
values
  ('s1-imsafe-pave.imsafe-checklist.c1', 'opt-1', 'The airplane''s required equipment and paperwork', false),
  ('s1-imsafe-pave.imsafe-checklist.c1', 'opt-2', 'Yourself — whether you are fit to fly today', true),
  ('s1-imsafe-pave.imsafe-checklist.c1', 'opt-3', 'The weather, the route, and the destination', false),
  ('s1-imsafe-pave.imsafe-checklist.c1', 'opt-4', 'The maintenance items due before the next flight', false),
  ('s1-imsafe-pave.imsafe-checklist.c2', 'opt-1', 'Sleep', false),
  ('s1-imsafe-pave.imsafe-checklist.c2', 'opt-2', 'Situation', false),
  ('s1-imsafe-pave.imsafe-checklist.c2', 'opt-3', 'Skill', false),
  ('s1-imsafe-pave.imsafe-checklist.c2', 'opt-4', 'Stress', true),
  ('s1-imsafe-pave.imsafe-checklist.c3', 'opt-1', 'Illness is its own item, and a cold can affect your ears, your sinuses and your judgment', true),
  ('s1-imsafe-pave.imsafe-checklist.c3', 'opt-2', 'Only whether you have a fever — without one, a cold is not an IMSAFE item', false),
  ('s1-imsafe-pave.imsafe-checklist.c3', 'opt-3', 'Nothing, as long as you take something for it before you go', false),
  ('s1-imsafe-pave.imsafe-checklist.c3', 'opt-4', 'Only conditions your aviation medical examiner already knows about', false),
  ('s1-imsafe-pave.pave-checklist.c1', 'opt-1', 'Preflight, Airspace, Visibility, Emergency planning', false),
  ('s1-imsafe-pave.pave-checklist.c1', 'opt-2', 'Planning, Aircraft, Weather, Experience', false),
  ('s1-imsafe-pave.pave-checklist.c1', 'opt-3', 'Pilot, Aircraft, Environment, External pressures', true),
  ('s1-imsafe-pave.pave-checklist.c1', 'opt-4', 'Pilot, Altitude, Visibility, Equipment', false),
  ('s1-imsafe-pave.pave-checklist.c2', 'opt-1', 'Pilot', false),
  ('s1-imsafe-pave.pave-checklist.c2', 'opt-2', 'External pressures', true),
  ('s1-imsafe-pave.pave-checklist.c2', 'opt-3', 'Environment', false),
  ('s1-imsafe-pave.pave-checklist.c2', 'opt-4', 'Aircraft', false),
  ('s1-imsafe-pave.pave-checklist.c3', 'opt-1', 'Environment', true),
  ('s1-imsafe-pave.pave-checklist.c3', 'opt-2', 'Pilot', false),
  ('s1-imsafe-pave.pave-checklist.c3', 'opt-3', 'External pressures', false),
  ('s1-imsafe-pave.pave-checklist.c3', 'opt-4', 'Aircraft', false),
  ('s1-imsafe-pave.hazardous-attitudes.c1', 'opt-1', 'Impulsivity', false),
  ('s1-imsafe-pave.hazardous-attitudes.c1', 'opt-2', 'Invulnerability', false),
  ('s1-imsafe-pave.hazardous-attitudes.c1', 'opt-3', 'Macho', false),
  ('s1-imsafe-pave.hazardous-attitudes.c1', 'opt-4', 'Anti-authority', true),
  ('s1-imsafe-pave.hazardous-attitudes.c2', 'opt-1', '"Taking chances is foolish."', false),
  ('s1-imsafe-pave.hazardous-attitudes.c2', 'opt-2', '"Not so fast. Think first."', false),
  ('s1-imsafe-pave.hazardous-attitudes.c2', 'opt-3', '"It could happen to me."', true),
  ('s1-imsafe-pave.hazardous-attitudes.c2', 'opt-4', '"I am not helpless. I can make a difference."', false),
  ('s1-imsafe-pave.hazardous-attitudes.c3', 'opt-1', 'Resignation', true),
  ('s1-imsafe-pave.hazardous-attitudes.c3', 'opt-2', 'Impulsivity', false),
  ('s1-imsafe-pave.hazardous-attitudes.c3', 'opt-3', 'Anti-authority', false),
  ('s1-imsafe-pave.hazardous-attitudes.c3', 'opt-4', 'Macho', false),
  ('s1-pattern.pattern-legs.c1', 'opt-4', 'Final', false),
  ('s1-pattern.pattern-legs.c1', 'opt-2', 'Base', true),
  ('s1-pattern.pattern-legs.c1', 'opt-1', 'Downwind', false),
  ('s1-pattern.pattern-legs.c1', 'opt-3', 'Crosswind', false),
  ('s1-pattern.pattern-legs.c2', 'opt-1', 'Whichever direction the wind favours that day', false),
  ('s1-pattern.pattern-legs.c2', 'opt-4', 'Right, so the runway stays visible from the left seat', false),
  ('s1-pattern.pattern-legs.c2', 'opt-2', 'Either, as long as you announce which one you are flying', false),
  ('s1-pattern.pattern-legs.c2', 'opt-3', 'Left, unless right traffic is indicated for that runway', true),
  ('s1-pattern.pattern-legs.c3', 'opt-4', 'Look it up before you go — the Chart Supplement publishes it for that airport', true),
  ('s1-pattern.pattern-legs.c3', 'opt-1', 'Assume it is the same as your home airport', false),
  ('s1-pattern.pattern-legs.c3', 'opt-2', 'Ask on the radio when you arrive', false),
  ('s1-pattern.pattern-legs.c3', 'opt-3', 'Fly overhead and match whatever traffic is already there', false),
  ('s1-pattern.right-of-way.c1', 'opt-3', 'The faster aircraft has the right of way, to keep the flow moving', false),
  ('s1-pattern.right-of-way.c1', 'opt-4', 'The higher aircraft has the right of way, since it can see the other', false),
  ('s1-pattern.right-of-way.c1', 'opt-1', 'The lower aircraft has the right of way, but must not use that to cut in front of or overtake the other', true),
  ('s1-pattern.right-of-way.c1', 'opt-2', 'Whoever announced first on the radio has the right of way', false),
  ('s1-pattern.right-of-way.c2', 'opt-2', 'You do — when aircraft of the same category converge, the one on the right has the right of way', true),
  ('s1-pattern.right-of-way.c2', 'opt-4', 'The other aircraft, because you saw it first', false),
  ('s1-pattern.right-of-way.c2', 'opt-1', 'Whichever aircraft is slower gives way', false),
  ('s1-pattern.right-of-way.c2', 'opt-3', 'Neither — both turn left', false),
  ('s1-pattern.right-of-way.c3', 'opt-1', 'Your airplane, because it is under power and can react faster', false),
  ('s1-pattern.right-of-way.c3', 'opt-2', 'The aircraft that entered the pattern first', false),
  ('s1-pattern.right-of-way.c3', 'opt-3', 'The aircraft at the lower altitude, whichever that is', false),
  ('s1-pattern.right-of-way.c3', 'opt-4', 'The glider — the rules give way to the less able to manoeuvre', true),
  ('s1-pattern.go-around.c1', 'opt-3', 'Only a runway that is physically blocked', false),
  ('s1-pattern.go-around.c1', 'opt-1', 'Only an instruction from the tower', false),
  ('s1-pattern.go-around.c1', 'opt-2', 'Any approach that is not going to end in a safe landing — too high, too fast, not lined up, or a runway you are not sure is clear', true),
  ('s1-pattern.go-around.c1', 'opt-4', 'Only a bounced landing', false),
  ('s1-pattern.go-around.c2', 'opt-4', 'Because a late go-around has to be reported', false),
  ('s1-pattern.go-around.c2', 'opt-1', 'Because the later the decision, the less height, speed, and time you have to make it work', true),
  ('s1-pattern.go-around.c2', 'opt-2', 'Because the engine will not produce full power close to the ground', false),
  ('s1-pattern.go-around.c2', 'opt-3', 'Because tower will not approve a go-around below a certain height', false),
  ('s1-pattern.go-around.c3', 'opt-2', 'Retract the flaps fully, then add power', false),
  ('s1-pattern.go-around.c3', 'opt-1', 'Turn away from the runway immediately', false),
  ('s1-pattern.go-around.c3', 'opt-3', 'Hold the landing attitude and wait for the airspeed to build', false),
  ('s1-pattern.go-around.c3', 'opt-4', 'Add power and pitch for a climb, then reconfigure in stages as the airplane accelerates', true),
  ('s1-regs-pic.pic-authority.c1', 'opt-1', 'Your instructor, because the endorsement already settled it', false),
  ('s1-regs-pic.pic-authority.c1', 'opt-4', 'The tower, since they clear you for takeoff', false),
  ('s1-regs-pic.pic-authority.c1', 'opt-3', 'You do — as pilot in command you are the final authority for that flight', true),
  ('s1-regs-pic.pic-authority.c1', 'opt-2', 'Nobody — if it is inside the limits on the endorsement, the flight is required to go', false),
  ('s1-regs-pic.pic-authority.c2', 'opt-1', 'You may deviate to the extent required to meet that emergency, and may be asked afterwards for a written report', true),
  ('s1-regs-pic.pic-authority.c2', 'opt-2', 'You must hold to every rule and manage the emergency within them', false),
  ('s1-regs-pic.pic-authority.c2', 'opt-4', 'You may deviate only if ATC approves the deviation first', false),
  ('s1-regs-pic.pic-authority.c2', 'opt-3', 'You may deviate freely, and nothing is ever asked about it afterwards', false),
  ('s1-regs-pic.pic-authority.c3', 'opt-4', 'Fly it — the signature is what makes it airworthy', false),
  ('s1-regs-pic.pic-authority.c3', 'opt-1', 'Ask the dispatcher to decide, since they released it', false),
  ('s1-regs-pic.pic-authority.c3', 'opt-3', 'Fly the pattern once to see whether it matters', false),
  ('s1-regs-pic.pic-authority.c3', 'opt-2', 'You decide whether the aircraft is in condition for safe flight, and you do not go if it is not', true),
  ('s1-regs-pic.student-limitations.c1', 'opt-3', 'It is allowed if they are family', false),
  ('s1-regs-pic.student-limitations.c1', 'opt-1', 'A student pilot may not carry passengers', true),
  ('s1-regs-pic.student-limitations.c1', 'opt-2', 'It is allowed if your instructor says it is fine', false),
  ('s1-regs-pic.student-limitations.c1', 'opt-4', 'It is allowed as long as nobody pays anything', false),
  ('s1-regs-pic.student-limitations.c2', 'opt-4', 'Yes, if you would have made the flight anyway', false),
  ('s1-regs-pic.student-limitations.c2', 'opt-1', 'Yes, as long as the payment only covers fuel and not your time', false),
  ('s1-regs-pic.student-limitations.c2', 'opt-2', 'No — a student pilot may not carry property for compensation or hire, and may not act as pilot in command for compensation', true),
  ('s1-regs-pic.student-limitations.c2', 'opt-3', 'Yes, if the parts belong to the flight school', false),
  ('s1-regs-pic.student-limitations.c3', 'opt-3', 'Enough total flight hours logged', false),
  ('s1-regs-pic.student-limitations.c3', 'opt-1', 'A passing grade on the knowledge test', false),
  ('s1-regs-pic.student-limitations.c3', 'opt-2', 'A medical certificate on its own', false),
  ('s1-regs-pic.student-limitations.c3', 'opt-4', 'A current instructor endorsement for solo flight in that make and model, and endorsements covering the flight you are about to make', true),
  ('s1-regs-pic.required-documents.c1', 'opt-2', 'Airworthiness certificate, registration, operating limitations, and weight and balance data', true),
  ('s1-regs-pic.required-documents.c1', 'opt-4', 'Your pilot certificate, your medical, and your logbook', false),
  ('s1-regs-pic.required-documents.c1', 'opt-1', 'The maintenance records for the last year', false),
  ('s1-regs-pic.required-documents.c1', 'opt-3', 'The instructor''s certificate and the school''s operating certificate', false),
  ('s1-regs-pic.required-documents.c2', 'opt-3', 'Your logbook and nothing else', false),
  ('s1-regs-pic.required-documents.c2', 'opt-1', 'Your student pilot certificate, your medical certificate, and government-issued photo identification', true),
  ('s1-regs-pic.required-documents.c2', 'opt-2', 'Your photo identification only', false),
  ('s1-regs-pic.required-documents.c2', 'opt-4', 'Nothing, as long as the aircraft documents are aboard', false),
  ('s1-regs-pic.required-documents.c3', 'opt-2', 'Because it must be displayed where it is legible to passengers and crew', true),
  ('s1-regs-pic.required-documents.c3', 'opt-4', 'So it does not get lost among the other paperwork', false),
  ('s1-regs-pic.required-documents.c3', 'opt-1', 'Because it has to be signed before every flight', false),
  ('s1-regs-pic.required-documents.c3', 'opt-3', 'Because it expires and needs checking on each flight', false),
  ('s1-stalls.stall-any-airspeed.c1', 'opt-2', 'The wing passes its critical angle of attack', true),
  ('s1-stalls.stall-any-airspeed.c1', 'opt-1', 'The airplane slows below a fixed speed printed in the handbook', false),
  ('s1-stalls.stall-any-airspeed.c1', 'opt-3', 'The engine loses power', false),
  ('s1-stalls.stall-any-airspeed.c1', 'opt-4', 'The nose is pointed too far above the horizon', false),
  ('s1-stalls.stall-any-airspeed.c2', 'opt-1', 'No — a stall only happens near the published stall speed', false),
  ('s1-stalls.stall-any-airspeed.c2', 'opt-2', 'No — a stall only happens with the nose high', false),
  ('s1-stalls.stall-any-airspeed.c2', 'opt-3', 'Yes — if the wing reaches its critical angle of attack, it stalls whatever the airspeed says', true),
  ('s1-stalls.stall-any-airspeed.c2', 'opt-4', 'Yes — but only with the engine at idle', false),
  ('s1-stalls.stall-any-airspeed.c3', 'opt-1', 'No — a nose-low attitude always means the wing is flying', false),
  ('s1-stalls.stall-any-airspeed.c3', 'opt-3', 'No — the airflow keeps the wing unstalled in a descent', false),
  ('s1-stalls.stall-any-airspeed.c3', 'opt-4', 'Yes — but only with the flaps down', false),
  ('s1-stalls.stall-any-airspeed.c3', 'opt-2', 'Yes — if the pilot pulls hard enough to pass the critical angle of attack', true),
  ('s1-stalls.stall-warning-signs.c1', 'opt-1', 'The airspeed suddenly increases', false),
  ('s1-stalls.stall-warning-signs.c1', 'opt-2', 'The controls feel mushy and answer more slowly', true),
  ('s1-stalls.stall-warning-signs.c1', 'opt-3', 'The engine begins running rough', false),
  ('s1-stalls.stall-warning-signs.c1', 'opt-4', 'The controls become stiffer and heavier', false),
  ('s1-stalls.stall-warning-signs.c2', 'opt-1', 'The wing is already stalled', false),
  ('s1-stalls.stall-warning-signs.c2', 'opt-3', 'Your airspeed has dropped below the white arc', false),
  ('s1-stalls.stall-warning-signs.c2', 'opt-2', 'You are approaching the critical angle of attack, with some margin left before the stall', true),
  ('s1-stalls.stall-warning-signs.c2', 'opt-4', 'The airplane has entered a spin', false),
  ('s1-stalls.stall-warning-signs.c3', 'opt-2', 'No — the wing stalls at an angle, and the speed that happens at changes with how hard you are maneuvering', true),
  ('s1-stalls.stall-warning-signs.c3', 'opt-1', 'Yes — above the stall range on the dial, you are safe', false),
  ('s1-stalls.stall-warning-signs.c3', 'opt-3', 'Yes — provided the flaps are up', false),
  ('s1-stalls.stall-warning-signs.c3', 'opt-4', 'No — because the airspeed indicator is usually inaccurate', false),
  ('s1-stalls.stall-recovery-spins.c1', 'opt-1', 'Add full power', false),
  ('s1-stalls.stall-recovery-spins.c1', 'opt-3', 'Level the wings with aileron', false),
  ('s1-stalls.stall-recovery-spins.c1', 'opt-4', 'Pull back to stop the airplane descending', false),
  ('s1-stalls.stall-recovery-spins.c1', 'opt-2', 'Reduce the angle of attack — release the back pressure and lower the nose', true),
  ('s1-stalls.stall-recovery-spins.c2', 'opt-1', 'A steep bank angle', false),
  ('s1-stalls.stall-recovery-spins.c2', 'opt-2', 'Yaw while the wing is stalled', true),
  ('s1-stalls.stall-recovery-spins.c2', 'opt-3', 'Full flaps', false),
  ('s1-stalls.stall-recovery-spins.c2', 'opt-4', 'An engine failure', false),
  ('s1-stalls.stall-recovery-spins.c3', 'opt-1', 'The air is denser near the ground, so the spin turns faster', false),
  ('s1-stalls.stall-recovery-spins.c3', 'opt-3', 'A spin cannot be recovered from at all', false),
  ('s1-stalls.stall-recovery-spins.c3', 'opt-2', 'Recovery costs altitude, and close to the ground there may not be enough left', true),
  ('s1-stalls.stall-recovery-spins.c3', 'opt-4', 'The engine is more likely to stop in a spin', false);

-- ---------------------------------------------------------------
-- Refuse to run if a card points at an objective that does not exist.
-- A typo in an objective id would otherwise import a card that can never be
-- scored against anything.
-- ---------------------------------------------------------------

do $check$
declare
  unknown_objectives text;
begin
  select string_agg(distinct i.objective_id, ', ' order by i.objective_id)
    into unknown_objectives
  from incoming_cards i
  where not exists (
    select 1 from public.learning_objectives o where o.id = i.objective_id
  );

  if unknown_objectives is not null then
    raise exception
      'Refusing to import: these objective ids do not exist in learning_objectives: %. Check the ids in docs/cards against the learning_objectives table.',
      unknown_objectives;
  end if;
end;
$check$;

-- ---------------------------------------------------------------
-- Cards. Content is overwritten; a content change resets the review.
-- ---------------------------------------------------------------

insert into public.quiz_cards
  (id, objective_id, lesson_slug, position, question, explanation, visual_description, status)
select id, objective_id, lesson_slug, position, question, explanation, visual_description, 'draft'
from incoming_cards
on conflict (id) do update set
  objective_id       = excluded.objective_id,
  lesson_slug        = excluded.lesson_slug,
  position           = excluded.position,
  question           = excluded.question,
  explanation        = excluded.explanation,
  visual_description = excluded.visual_description,
  updated_at         = now(),
  status = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then 'draft'
    else public.quiz_cards.status
  end,
  reviewed_by = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then null
    else public.quiz_cards.reviewed_by
  end,
  reviewed_at = case
    when public.quiz_cards.question is distinct from excluded.question
      or public.quiz_cards.explanation is distinct from excluded.explanation
      or public.quiz_cards.visual_description is distinct from excluded.visual_description
    then null
    else public.quiz_cards.reviewed_at
  end;

-- ---------------------------------------------------------------
-- Options. Changed option text also invalidates a review.
-- ---------------------------------------------------------------

update public.quiz_cards c
set status = 'draft', reviewed_by = null, reviewed_at = null, updated_at = now()
where c.status = 'approved'
  and exists (
    select 1
    from incoming_options i
    left join public.quiz_card_options o
      on o.card_id = i.card_id and o.option_id = i.option_id
    where i.card_id = c.id
      and (o.text is distinct from i.text or o.is_correct is distinct from i.is_correct)
  );

insert into public.quiz_card_options (card_id, option_id, text, is_correct)
select card_id, option_id, text, is_correct
from incoming_options
on conflict (card_id, option_id) do update set
  text       = excluded.text,
  is_correct = excluded.is_correct;

delete from public.quiz_card_options o
where exists (select 1 from incoming_cards i where i.id = o.card_id)
  and not exists (
    select 1 from incoming_options i
    where i.card_id = o.card_id and i.option_id = o.option_id
  );

-- ---------------------------------------------------------------
-- Retire what the documents no longer contain.
-- ---------------------------------------------------------------

update public.quiz_cards c
set status = 'retired', updated_at = now()
where c.status <> 'retired'
  and not exists (select 1 from incoming_cards i where i.id = c.id);

drop table incoming_cards;
drop table incoming_options;

-- ---------------------------------------------------------------
-- Report.
-- ---------------------------------------------------------------

select
  count(*) as total_cards,
  count(*) filter (where status = 'draft') as draft_cards,
  count(*) filter (where status = 'approved') as approved_cards,
  count(*) filter (where status = 'retired') as retired_cards
from public.quiz_cards;
