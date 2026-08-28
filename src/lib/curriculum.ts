/**
 * Part 141-style Private Pilot ground school curriculum.
 *
 * Lesson content lives in code rather than the database: it is the same for
 * every student, it belongs in version control, and it keeps the prototype
 * free of a CMS. Only per-student progress goes to Supabase.
 *
 * ACS Areas of Operation are referenced BY NAME, not by task code. Task codes
 * (PA.I.A and the like) are revision-specific and easy to get subtly wrong,
 * and a student who shows a DPE a bad code pays for our mistake. Handbooks are
 * cited by name for the same reason — chapter numbers move between revisions.
 * The instructor cites specifics at answer time with the standing instruction
 * to confirm against the current handbook.
 */

export type LessonSource = "PHAK" | "AFH" | "AIM" | "14 CFR";

export type Lesson = {
  slug: string;
  title: string;
  objective: string;
  summary: string;
  objectives: string[];
  sources: LessonSource[];
  /** Private Pilot ACS Areas of Operation, by name. */
  acsAreas: string[];
  /** Plain-language topic label shown alongside the ACS area. */
  topic: string;
  /** Optional reviewed history card. See src/lib/instructor/history-cards.ts */
  historyCardId?: string;
  estimatedMinutes: number;
};

export type Stage = {
  slug: string;
  number: 1 | 2 | 3;
  title: string;
  tagline: string;
  goal: string;
  lessons: Lesson[];
  outline?: string[];
};

const stageOneLessons: Lesson[] = [
  {
    slug: "s1-welcome",
    title: "Welcome to the flight deck",
    objective:
      "Explain the training path, the ACS, CFI vs AI, and what 'ready' actually means.",
    summary:
      "What you are signing up for, who does what, and how you will know you are making progress.",
    objectives: [
      "Describe the path from first lesson to private pilot certificate",
      "Explain what the ACS is and how it sets the standard",
      "State what a human CFI must do that an AI instructor cannot",
    ],
    sources: ["14 CFR", "PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Pilot qualifications and the training process",
    historyCardId: "coleman",
    estimatedMinutes: 20,
  },
  {
    slug: "s1-imsafe-pave",
    title: "IMSAFE and PAVE — should we fly?",
    objective: "Use IMSAFE and PAVE before every lesson.",
    summary:
      "Two checklists that run on you and your situation, not the airplane. The first real pilot decision you will make.",
    objectives: [
      "Apply the IMSAFE checklist to your own condition before a flight",
      "Apply the PAVE checklist to pilot, aircraft, environment, and external pressure",
      "Describe the hazardous attitudes and their antidotes",
    ],
    sources: ["PHAK", "AIM"],
    acsAreas: ["Preflight Preparation"],
    topic: "Human factors and aeronautical decision making",
    historyCardId: "bragg",
    estimatedMinutes: 30,
  },
  {
    slug: "s1-airplane-parts",
    title: "Airplane parts and what they do",
    objective:
      "Identify primary flight controls, flaps, landing gear, and powerplant at a trainer level.",
    summary:
      "Naming the pieces, and knowing what each one is for when you are standing at the airplane.",
    objectives: [
      "Identify the primary flight controls and the axis each one works about",
      "Describe what flaps do and when they are used",
      "Name the major components of a typical training airplane",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Airplanes and systems",
    historyCardId: "latimer-engineering",
    estimatedMinutes: 30,
  },
  {
    slug: "s1-four-forces",
    title: "Four forces and why the wing flies",
    objective:
      "Explain lift, weight, thrust, and drag, and what happens when one changes.",
    summary:
      "The four forces, angle of attack, and why a stall is about angle — not speed.",
    objectives: [
      "Name the four forces and describe how they act in steady flight",
      "Explain how angle of attack relates to lift",
      "Describe a stall in terms of angle of attack rather than airspeed",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Aerodynamics",
    estimatedMinutes: 30,
  },
  {
    slug: "s1-axes-stability",
    title: "Axes of flight and stability",
    objective: "Pitch, roll, and yaw; stability versus control.",
    summary:
      "How the airplane moves about three axes, and why a stable airplane wants to fly straight.",
    objectives: [
      "Describe motion about the lateral, longitudinal, and vertical axes",
      "Explain the difference between stability and controllability",
      "Describe what adverse yaw is and how it is corrected",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Aerodynamics",
    estimatedMinutes: 25,
  },
  {
    slug: "s1-engines-fuel",
    title: "Engine, fuel, and oil — what keeps you in the air",
    objective:
      "Describe a basic trainer fuel and oil system, and why fuel planning is non-negotiable.",
    summary:
      "Where the fuel goes, what the magnetos are for, and why running a tank dry is a decision, not an accident.",
    objectives: [
      "Trace the fuel system from tank to engine on a typical trainer",
      "Explain why there are two magnetos and what the runup check confirms",
      "Describe how to verify fuel quantity and quality before flight",
    ],
    sources: ["PHAK", "AFH"],
    acsAreas: ["Preflight Preparation"],
    topic: "Airplanes and systems",
    estimatedMinutes: 35,
  },
  {
    slug: "s1-pitot-static-gyro",
    title: "Flight instruments you will live by",
    objective: "Pitot-static and gyroscopic instruments, and which fails how.",
    summary:
      "The six-pack, what drives each instrument, and how to spot one that is lying to you.",
    objectives: [
      "Identify which instruments are pitot-static and which are gyroscopic",
      "Describe the indications of a blocked pitot tube and a blocked static port",
      "Explain what each instrument in the primary group tells you",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Airplanes and systems",
    estimatedMinutes: 30,
  },
  {
    slug: "s1-airport-ramp",
    title: "Airport, ramp, and runway language",
    objective:
      "Read a simple airport diagram: taxiways, hold short, run-up, active runway.",
    summary:
      "How to move around an airport without guessing — and without ending up somewhere you should not be.",
    objectives: [
      "Determine runway numbers from magnetic heading",
      "Interpret common runway and taxiway markings and signs",
      "Explain what hold short means and why it is never optional",
    ],
    sources: ["PHAK", "AIM"],
    acsAreas: ["Airport and Seaplane Base Operations"],
    topic: "Airport operations",
    historyCardId: "community-airport",
    estimatedMinutes: 35,
  },
  {
    slug: "s1-radio",
    title: "Talking on the radio without freezing",
    objective:
      "Standard phraseology for taxi, takeoff, and pattern at towered and nontowered fields.",
    summary:
      "What to say, when to say it, and what to do when you say it wrong. Everyone sounds rough at first.",
    objectives: [
      "Build a standard radio call: who you are calling, who you are, where you are, what you want",
      "Describe operating at a nontowered airport using the CTAF",
      "Explain what to do after a readback error or a missed call",
    ],
    sources: ["AIM"],
    acsAreas: ["Airport and Seaplane Base Operations"],
    topic: "Communications",
    historyCardId: "willa-brown",
    estimatedMinutes: 30,
  },
  {
    slug: "s1-airspace-intro",
    title: "Airspace in plain English",
    objective:
      "Class B, C, D, E, and G — their purpose, who you talk to, and why they exist.",
    summary:
      "Classes of airspace, what each one asks of you, and how to tell which one you are in.",
    objectives: [
      "Describe the dimensions and entry requirements of each airspace class",
      "State the basic VFR weather minimums a student pilot will use",
      "Identify airspace boundaries on a sectional chart",
    ],
    sources: ["PHAK", "AIM", "14 CFR"],
    acsAreas: ["Preflight Preparation"],
    topic: "Airports, airspace, and flight information",
    estimatedMinutes: 40,
  },
  {
    slug: "s1-weather-intro",
    title: "Weather that can end a first solo",
    objective:
      "Wind, visibility, ceiling, and convective weather; where to look it up and when to say no.",
    summary:
      "Why air moves, how clouds form, and the weather that decides whether you fly today.",
    objectives: [
      "Describe how temperature, pressure, and moisture drive weather",
      "Read a METAR and a TAF and say what they mean in plain language",
      "Explain the conditions that produce fog, thunderstorms, and icing",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    topic: "Weather information",
    estimatedMinutes: 45,
  },
  {
    slug: "s1-regs-pic",
    title: "You are PIC — even as a student",
    objective:
      "Pilot-in-command authority and responsibility, careless and reckless operation, and student limitations.",
    summary:
      "The regulation that makes you the final authority, and what that actually costs you.",
    objectives: [
      "Describe the authority and responsibility of the pilot in command",
      "Describe student pilot privileges and limitations",
      "Identify the documents required aboard the aircraft and on your person",
    ],
    sources: ["14 CFR", "AIM"],
    acsAreas: ["Preflight Preparation"],
    topic: "Regulations and pilot qualifications",
    historyCardId: "tuskegee",
    estimatedMinutes: 35,
  },
  {
    slug: "s1-preflight",
    title: "Preflight like it matters",
    objective:
      "Walk-around flow, required documents, the POH, and why 'good enough' is not.",
    summary:
      "Airworthiness, the walkaround, and the habit of never taking someone's word that the airplane is fine.",
    objectives: [
      "Determine whether an aircraft is airworthy before flight",
      "Perform a systematic preflight inspection using the checklist",
      "Describe proper engine starting, taxi, and runup procedures",
    ],
    sources: ["AFH", "PHAK"],
    acsAreas: ["Preflight Procedures"],
    topic: "Preflight assessment",
    historyCardId: "wasp",
    estimatedMinutes: 35,
  },
  {
    slug: "s1-stalls",
    title: "Stalls, spins, and angle of attack",
    objective:
      "Angle of attack, stall recognition, and recovery; spin awareness at knowledge level.",
    summary:
      "The most misunderstood idea in flying, and the one that matters most close to the ground.",
    objectives: [
      "Explain why a wing can stall at any airspeed and any attitude",
      "Describe the indications that precede a stall",
      "Describe the general stall recovery procedure and why spin awareness matters",
    ],
    sources: ["PHAK", "AFH"],
    acsAreas: ["Slow Flight and Stalls"],
    topic: "Slow flight, stalls, and spin awareness",
    estimatedMinutes: 40,
  },
  {
    slug: "s1-pattern",
    title: "The traffic pattern",
    objective:
      "Upwind, crosswind, downwind, base, and final; right-of-way basics.",
    summary:
      "The shape every airport flies, and how to fit into it without surprising anyone.",
    objectives: [
      "Describe a standard traffic pattern and each of its legs",
      "State the basic right-of-way rules that apply in the pattern",
      "Explain when and why to go around",
    ],
    sources: ["AIM", "AFH", "14 CFR"],
    acsAreas: ["Takeoffs, Landings, and Go-Arounds"],
    topic: "Traffic patterns and right-of-way",
    estimatedMinutes: 35,
  },
  {
    slug: "s1-solo-knowledge",
    title: "Knowledge that stands between you and solo",
    objective:
      "What a CFI must see before endorsing solo — and why an AI cannot endorse.",
    summary:
      "The last knowledge checkpoint before the day the instructor gets out of the airplane.",
    objectives: [
      "Describe the knowledge and endorsements required before solo flight",
      "Explain the limitations that apply to a student pilot flying solo",
      "State who is authorized to endorse you and who is not",
    ],
    sources: ["14 CFR", "AFH"],
    acsAreas: ["Preflight Preparation"],
    topic: "Solo requirements",
    historyCardId: "coleman",
    estimatedMinutes: 30,
  },
];

export const stages: Stage[] = [
  {
    slug: "stage-1",
    number: 1,
    title: "Foundations & Pre-Solo",
    tagline: "Everything you need to know before you fly the airplane yourself.",
    goal: "Ready for dual instruction and first-solo knowledge.",
    lessons: stageOneLessons,
  },
  {
    slug: "stage-2",
    number: 2,
    title: "Solo & Cross-Country",
    tagline: "Going somewhere, and getting back.",
    goal: "Ready for solo cross-country knowledge and night operations.",
    lessons: [],
    outline: [
      "Navigation and chart reading",
      "Practical weather and go/no-go decisions",
      "Cross-country flight planning",
      "Night operations",
      "Solo cross-country knowledge",
    ],
  },
  {
    slug: "stage-3",
    number: 3,
    title: "Checkride Ready",
    tagline: "The oral, the judgment, and the confidence to walk in prepared.",
    goal: "Ready for the knowledge test and the practical test.",
    lessons: [],
    outline: [
      "ACS oral preparation",
      "Scenario-based judgment",
      "Knowledge test review",
      "Stage check readiness",
    ],
  },
];

export function getStage(slug: string): Stage | undefined {
  return stages.find((stage) => stage.slug === slug);
}

export function getLesson(
  stageSlug: string,
  lessonSlug: string,
): { stage: Stage; lesson: Lesson } | undefined {
  const stage = getStage(stageSlug);
  const lesson = stage?.lessons.find((item) => item.slug === lessonSlug);
  return stage && lesson ? { stage, lesson } : undefined;
}

export const allLessonSlugs = stages.flatMap((stage) =>
  stage.lessons.map((lesson) => lesson.slug),
);
