/**
 * The shape of the Part 141-style Private Pilot ground school curriculum.
 *
 * Types only. The content itself — stages, lessons and learning objectives —
 * lives in the database (`curriculum_stages`, `curriculum_lessons`,
 * `learning_objectives`), is edited in the Supabase Table Editor, and is read
 * by src/lib/curriculum-store.ts. See docs/editing-lessons.md.
 *
 * ACS Areas of Operation are referenced BY NAME, not by task code. Task codes
 * (PA.I.A and the like) are revision-specific and easy to get subtly wrong,
 * and a student who shows a DPE a bad code pays for our mistake. Handbooks are
 * cited by name for the same reason — chapter numbers move between revisions.
 * The instructor cites specifics at answer time with the standing instruction
 * to confirm against the current handbook.
 */

export type LessonSource = "PHAK" | "AFH" | "AIM" | "14 CFR";

/**
 * A single learning objective, one row of `learning_objectives`.
 *
 * `id` IS PERMANENT. Mastery records reference it — `objective_signals`,
 * `objective_assessments` and `quiz_cards` all store it — and since 0018 the
 * database refuses to change it. Rewording `text` is fine and expected: it is
 * still the same objective, and every student's history stays attached.
 *
 * To remove an objective, set `retired_at` on its row. Never delete it, and
 * never reuse a retired id for something else.
 */
export type LearningObjective = {
  id: string;
  text: string;
  isSafetyCritical?: boolean;
};

export type Lesson = {
  slug: string;
  title: string;
  objective: string;
  summary: string;
  objectives: LearningObjective[];
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
  number: number;
  title: string;
  tagline: string;
  goal: string;
  lessons: Lesson[];
  outline?: string[];
};
