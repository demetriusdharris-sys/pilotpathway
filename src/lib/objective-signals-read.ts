import type { SupabaseClient } from "@supabase/supabase-js";
import type { SignalConfidence, SignalReading } from "@/lib/objective-signals";

export type LatestObjectiveSignal = {
  objectiveId: string;
  reading: SignalReading;
  confidence: SignalConfidence;
  observedAt: string;
};

/**
 * Mirrors the CHECK constraints on objective_signals in 0009. Values arriving
 * from the database are validated rather than trusted: a row that does not
 * match is dropped, so a future reading we do not understand cannot reach the
 * tutor prompt as a malformed phrase.
 */
const READINGS: readonly string[] = ["solid", "shaky", "missing"];
const CONFIDENCES: readonly string[] = ["low", "medium", "high"];

/**
 * The newest signal per objective for one student in one lesson.
 *
 * Read with the caller's own client, not the admin client. The "Students read
 * their own signals" policy from 0009 already scopes this to the signed-in
 * student, and going through RLS means a bug here cannot leak another
 * student's readings.
 *
 * Signals are append-only, so an objective accumulates one row per exchange
 * that touched it. Newest-first ordering plus first-wins de-duplication gives
 * the current reading and discards the history.
 */
export async function loadLatestSignals(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string,
): Promise<LatestObjectiveSignal[]> {
  const { data, error } = await supabase
    .from("objective_signals")
    .select("objective_id, reading, confidence, observed_at")
    .eq("user_id", userId)
    .eq("lesson_slug", lessonSlug)
    .order("observed_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("Failed to load objective signals:", {
        userId,
        lessonSlug,
        error: error.message,
      });
    }
    return [];
  }

  const latest: LatestObjectiveSignal[] = [];
  const seen = new Set<string>();

  for (const row of data) {
    const objectiveId = row.objective_id;
    const reading = row.reading;
    const confidence = row.confidence;
    const observedAt = row.observed_at;

    if (
      typeof objectiveId !== "string" ||
      typeof reading !== "string" ||
      typeof confidence !== "string" ||
      typeof observedAt !== "string" ||
      !READINGS.includes(reading) ||
      !CONFIDENCES.includes(confidence)
    ) {
      continue;
    }

    // Rows arrive newest first, so the first one seen for an objective is the
    // current reading and every later row is history.
    if (seen.has(objectiveId)) {
      continue;
    }
    seen.add(objectiveId);

    latest.push({
      objectiveId,
      reading: reading as SignalReading,
      confidence: confidence as SignalConfidence,
      observedAt,
    });
  }

  return latest;
}
