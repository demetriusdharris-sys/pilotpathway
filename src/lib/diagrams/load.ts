import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Which diagrams a student may see on a lesson.
 *
 * Reads with the caller's own client, so the policy from 0042 is the control:
 * an approved diagram is readable by anyone signed in, a draft one only by a
 * reviewer. A diagram asserts facts, so an unapproved one must not render on a
 * lesson any more than an unapproved quiz card may.
 *
 * Fails soft to nothing. A lesson with no picture is the state this product has
 * been in since it was built; a lesson that will not load because a decorative
 * read failed would be worse.
 */

export type LessonDiagram = {
  key: string;
  title: string;
  caption: string;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function loadApprovedDiagrams(
  supabase: SupabaseClient,
  lessonSlug: string,
): Promise<LessonDiagram[]> {
  const { data, error } = await supabase
    .from("lesson_diagrams")
    .select("diagram_key, title, caption, status")
    .eq("lesson_slug", lessonSlug)
    .eq("status", "approved")
    .order("position");

  if (error) {
    console.error("Could not read lesson diagrams:", {
      lessonSlug,
      error: error.message,
    });
    return [];
  }

  const diagrams: LessonDiagram[] = [];

  for (const row of (data ?? []) as Row[]) {
    const key = text(row.diagram_key);
    const title = text(row.title);
    const caption = text(row.caption);

    if (key && title && caption) {
      diagrams.push({ key, title, caption });
    }
  }

  return diagrams;
}
