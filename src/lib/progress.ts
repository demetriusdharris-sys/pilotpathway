import { createClient } from "@/lib/supabase/server";
import type { LessonProgress, LessonStatus } from "@/types/database";

export type ProgressBySlug = Map<string, LessonStatus>;

/**
 * Reads the signed-in student's progress. Returns an empty map rather than
 * throwing when the table is missing, so the dashboard still renders before
 * the migration has been run.
 */
export async function getProgress(userId: string): Promise<ProgressBySlug> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_slug, status")
    .eq("user_id", userId);

  if (error || !data) {
    return new Map();
  }

  return new Map(
    (data as Pick<LessonProgress, "lesson_slug" | "status">[]).map((row) => [
      row.lesson_slug,
      row.status,
    ]),
  );
}

export function summarize(stageSlugs: string[], progress: ProgressBySlug) {
  const completed = stageSlugs.filter(
    (slug) => progress.get(slug) === "completed",
  ).length;
  const inProgress = stageSlugs.filter(
    (slug) => progress.get(slug) === "in_progress",
  ).length;

  return {
    completed,
    inProgress,
    total: stageSlugs.length,
    percent:
      stageSlugs.length === 0
        ? 0
        : Math.round((completed / stageSlugs.length) * 100),
  };
}
