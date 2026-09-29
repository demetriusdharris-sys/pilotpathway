import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The diagram review queue.
 *
 * Reads with the reviewer's own client — 0042's policy already lets a reviewer
 * see every diagram and a student only approved ones, so RLS is doing the work
 * and the service role would add nothing. That differs from the card queue,
 * which needs the service role because a card hides its answer key. A diagram
 * has nothing to hide.
 *
 * Writes go through `review_diagram`, which checks `may_review_content()` from
 * `auth.uid()`.
 */

export type ReviewableDiagram = {
  key: string;
  lessonSlug: string;
  lessonTitle: string | null;
  title: string;
  caption: string;
  sourceNote: string | null;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function loadDiagramQueue(
  supabase: SupabaseClient,
  status: string,
): Promise<ReviewableDiagram[]> {
  const { data, error } = await supabase
    .from("lesson_diagrams")
    .select(
      "diagram_key, lesson_slug, title, caption, source_note, status, review_note, reviewed_by, reviewed_at",
    )
    .eq("status", status)
    .order("lesson_slug")
    .order("position");

  if (error) {
    throw new Error(`diagram queue: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) return [];

  const slugs = [
    ...new Set(
      rows
        .map((row) => text(row.lesson_slug))
        .filter((slug): slug is string => slug !== null),
    ),
  ];

  const { data: lessons } = await supabase
    .from("curriculum_lessons")
    .select("slug, title")
    .in("slug", slugs);

  const titleBySlug = new Map<string, string>();
  for (const row of (lessons ?? []) as Row[]) {
    const slug = text(row.slug);
    const title = text(row.title);
    if (slug && title) titleBySlug.set(slug, title);
  }

  const diagrams: ReviewableDiagram[] = [];

  for (const row of rows) {
    const key = text(row.diagram_key);
    const lessonSlug = text(row.lesson_slug);
    const title = text(row.title);
    const caption = text(row.caption);

    if (!key || !lessonSlug || !title || !caption) continue;

    diagrams.push({
      key,
      lessonSlug,
      lessonTitle: titleBySlug.get(lessonSlug) ?? null,
      title,
      caption,
      sourceNote: text(row.source_note),
      status: text(row.status) ?? "draft",
      reviewNote: text(row.review_note),
      reviewedBy: text(row.reviewed_by),
      reviewedAt: text(row.reviewed_at),
    });
  }

  return diagrams;
}

export type DiagramCounts = {
  draft: number;
  needs_changes: number;
  approved: number;
  retired: number;
};

export async function loadDiagramCounts(
  supabase: SupabaseClient,
): Promise<DiagramCounts> {
  const { data, error } = await supabase
    .from("lesson_diagrams")
    .select("status");

  if (error) {
    throw new Error(`diagram counts: ${error.message}`);
  }

  const counts: DiagramCounts = {
    draft: 0,
    needs_changes: 0,
    approved: 0,
    retired: 0,
  };

  for (const row of (data ?? []) as Row[]) {
    const status = text(row.status);
    if (status && status in counts) counts[status as keyof DiagramCounts] += 1;
  }

  return counts;
}

export async function recordDiagramReview(
  supabase: SupabaseClient,
  key: string,
  decision: "approve" | "needs_changes" | "retire",
  reviewer: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("review_diagram", {
    p_diagram_key: key,
    p_decision: decision,
    p_reviewer: reviewer,
    p_note: note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
