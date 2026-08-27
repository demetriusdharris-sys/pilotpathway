/**
 * Part 141-style Private Pilot ground school curriculum.
 *
 * Lesson content lives in code rather than the database: it is the same for
 * every student, it belongs in version control, and it keeps the prototype
 * free of a CMS. Only per-student progress goes to Supabase.
 *
 * Sources are cited by handbook name, not chapter number. Chapter numbering
 * shifts between FAA handbook revisions, and a confidently wrong citation is
 * worse than none. The AI instructor cites specifics at answer time and tells
 * the student to confirm against the current handbook.
 */

export type LessonSource = "PHAK" | "AFH" | "AIM" | "14 CFR";

export type Lesson = {
  slug: string;
  title: string;
  summary: string;
  objectives: string[];
  sources: LessonSource[];
  /** Private Pilot ACS Areas of Operation, referenced by name. */
  acsAreas: string[];
  estimatedMinutes: number;
};

export type Stage = {
  slug: string;
  number: 1 | 2 | 3;
  title: string;
  tagline: string;
  goal: string;
  /** Stages 2 and 3 are outlined but not yet written. */
  lessons: Lesson[];
  outline?: string[];
};

const stageOneLessons: Lesson[] = [
  {
    slug: "four-forces",
    title: "Why Airplanes Fly",
    summary:
      "Lift, weight, thrust, and drag — and what actually happens when one of them changes.",
    objectives: [
      "Name the four forces and describe how they act on an airplane in steady flight",
      "Explain how angle of attack relates to lift",
      "Describe what a stall is in terms of angle of attack, not airspeed",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 25,
  },
  {
    slug: "airplane-systems",
    title: "Airplane Systems",
    summary:
      "Engine, fuel, electrical, and flight controls — enough to know what you are looking at on preflight.",
    objectives: [
      "Trace the fuel system from tank to engine on a typical training airplane",
      "Describe the purpose of the magnetos and why there are two",
      "Explain what the primary flight controls do about each axis",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 30,
  },
  {
    slug: "flight-instruments",
    title: "Flight Instruments",
    summary:
      "The six-pack, what drives each instrument, and how to recognize when one is lying to you.",
    objectives: [
      "Identify which instruments are pitot-static and which are gyroscopic",
      "Describe the indications of a blocked pitot tube and a blocked static port",
      "Explain what each instrument in the primary group tells you",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 30,
  },
  {
    slug: "airport-operations",
    title: "Airports, Runways, and Markings",
    summary:
      "Traffic patterns, runway numbering, signs, and markings — how to move around an airport without guessing.",
    objectives: [
      "Determine runway numbers from magnetic heading",
      "Describe a standard traffic pattern and each of its legs",
      "Interpret common runway and taxiway markings and signs",
    ],
    sources: ["PHAK", "AIM"],
    acsAreas: ["Airport and Seaplane Base Operations"],
    estimatedMinutes: 35,
  },
  {
    slug: "radio-communications",
    title: "Radio Communications",
    summary:
      "What to say, when to say it, and what to do when you say it wrong. Everyone sounds rough at first.",
    objectives: [
      "Build a standard radio call: who you are calling, who you are, where you are, what you want",
      "Describe how to operate at a non-towered airport using the CTAF",
      "Explain what to do after a readback error or a missed call",
    ],
    sources: ["AIM"],
    acsAreas: ["Airport and Seaplane Base Operations"],
    estimatedMinutes: 30,
  },
  {
    slug: "airspace",
    title: "Airspace",
    summary:
      "Classes A through G, what each one asks of you, and how to tell which one you are in.",
    objectives: [
      "Describe the dimensions and entry requirements of each airspace class",
      "State the basic VFR weather minimums for the airspace a student pilot will use",
      "Identify airspace boundaries on a sectional chart",
    ],
    sources: ["PHAK", "AIM", "14 CFR"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 40,
  },
  {
    slug: "regulations-essentials",
    title: "Regulations That Apply to You Now",
    summary:
      "The student pilot rules: privileges, limitations, currency, and what your logbook has to show.",
    objectives: [
      "Describe student pilot privileges and limitations",
      "Explain what endorsements are required before solo and before solo cross-country",
      "Identify the documents that must be aboard the aircraft and on your person",
    ],
    sources: ["14 CFR", "AIM"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 35,
  },
  {
    slug: "preflight-procedures",
    title: "Preflight Inspection and Procedures",
    summary:
      "Airworthiness, the walkaround, and the habit of never taking someone's word that the airplane is fine.",
    objectives: [
      "Determine whether an aircraft is airworthy before flight",
      "Perform a systematic preflight inspection using the checklist",
      "Describe proper engine starting, taxi, and runup procedures",
    ],
    sources: ["AFH", "PHAK"],
    acsAreas: ["Preflight Procedures"],
    estimatedMinutes: 35,
  },
  {
    slug: "weather-fundamentals",
    title: "Weather Fundamentals",
    summary:
      "Why air moves, how clouds form, and the weather that decides whether you fly today.",
    objectives: [
      "Describe how temperature, pressure, and moisture drive weather",
      "Explain the conditions that produce fog, thunderstorms, and icing",
      "Read a METAR and a TAF and say what they mean in plain language",
    ],
    sources: ["PHAK"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 45,
  },
  {
    slug: "human-factors",
    title: "Human Factors and Decision Making",
    summary:
      "The airplane is usually fine. This lesson is about the pilot — fatigue, pressure, illusions, and knowing when to say no.",
    objectives: [
      "Describe the hazardous attitudes and their antidotes",
      "Recognize the symptoms of hypoxia, hyperventilation, and spatial disorientation",
      "Use a personal minimums checklist to make a go/no-go decision",
    ],
    sources: ["PHAK", "AIM"],
    acsAreas: ["Preflight Preparation"],
    estimatedMinutes: 35,
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
