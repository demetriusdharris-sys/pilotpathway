import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What a student has actually shown, per learning objective.
 *
 * This reads the `objective_mastery` view from 0009, which is computed
 * exclusively from `objective_assessments` — scored quiz answers. It never
 * touches `objective_signals`, the AI's read of a conversation. That wall is
 * the point: what a student is told they have shown, and what a school is
 * eventually reported, must rest on something that was marked, not on the
 * tutor's impression. Signals stay where they are useful, steering the tutor.
 *
 * Read with the caller's own client. The policies from 0009 scope assessments
 * to the signed-in student and the view runs with security_invoker, so a bug
 * here cannot show one student another's record.
 *
 * Every read fails soft and returns nothing: an objective with no mastery row
 * and an objective we could not read both render as "not shown yet", which is
 * true in both cases. Claiming mastery we cannot verify is the one failure
 * that would matter.
 */

export type ObjectiveMastery = {
  objectiveId: string;
  attempts: number;
  correct: number;
  isMastered: boolean;
};

export type MasteryByObjective = Map<string, ObjectiveMastery>;

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function loadMastery(
  supabase: SupabaseClient,
  userId: string,
): Promise<MasteryByObjective> {
  const { data, error } = await supabase
    .from("objective_mastery")
    .select("objective_id, attempts, correct, is_mastered")
    .eq("user_id", userId);

  const mastery: MasteryByObjective = new Map();

  if (error || !data) {
    if (error) {
      console.error("Failed to load objective mastery:", {
        userId,
        error: error.message,
      });
    }
    return mastery;
  }

  for (const row of data) {
    if (typeof row.objective_id !== "string") continue;

    mastery.set(row.objective_id, {
      objectiveId: row.objective_id,
      attempts: count(row.attempts),
      correct: count(row.correct),
      isMastered: row.is_mastered === true,
    });
  }

  return mastery;
}

/**
 * The objectives a student can currently show anything on — those with at
 * least one approved quiz card. The RLS policy from 0014 hides draft cards, so
 * this is exactly what the student could be asked.
 *
 * Without this, an objective with no card yet would be displayed as one the
 * student has failed to demonstrate, when in truth we have not asked them.
 * Optionally narrowed to one lesson.
 */
export async function loadAssessableObjectives(
  supabase: SupabaseClient,
  lessonSlug?: string,
): Promise<Set<string>> {
  let query = supabase.from("quiz_cards").select("objective_id");

  if (lessonSlug !== undefined) {
    query = query.eq("lesson_slug", lessonSlug);
  }

  const { data, error } = await query;

  const objectives = new Set<string>();

  if (error || !data) {
    if (error) {
      console.error("Failed to load assessable objectives:", {
        lessonSlug: lessonSlug ?? null,
        error: error.message,
      });
    }
    return objectives;
  }

  for (const row of data) {
    if (typeof row.objective_id === "string") {
      objectives.add(row.objective_id);
    }
  }

  return objectives;
}

export type ObjectiveState = "mastered" | "in_progress" | "not_attempted";

/** How one objective should read to the student. */
export function objectiveState(
  objectiveId: string,
  mastery: MasteryByObjective,
): ObjectiveState {
  const record = mastery.get(objectiveId);

  if (!record || record.attempts === 0) {
    return "not_attempted";
  }

  return record.isMastered ? "mastered" : "in_progress";
}

/** Objectives shown, out of those a student could currently be asked about. */
export function masterySummary(
  objectiveIds: string[],
  assessable: Set<string>,
  mastery: MasteryByObjective,
) {
  const available = objectiveIds.filter((id) => assessable.has(id));
  const shown = available.filter(
    (id) => mastery.get(id)?.isMastered === true,
  ).length;

  return {
    shown,
    available: available.length,
    percent:
      available.length === 0 ? 0 : Math.round((shown / available.length) * 100),
  };
}
