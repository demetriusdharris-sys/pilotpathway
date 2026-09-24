import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The question review queue, for a CFI or an administrator.
 *
 * Reads with the service role **after** the caller's role has been checked,
 * because a reviewer needs the answer key and the explanation and those
 * columns are not granted to anyone in the browser. Granting them so a
 * reviewer could read them would hand them to every student too — a GRANT is
 * role-wide, and RLS restricts rows rather than columns.
 *
 * Nothing here decides who may review. `isReviewer` asks the database, and
 * `review_question` asks again before it writes: a page decides what to show,
 * a function decides what may happen.
 */

export type ReviewDecision = "approve" | "needs_changes" | "retire";

export type ReviewableQuestion = {
  id: string;
  sourceKey: string | null;
  acsCode: string;
  knowledgeArea: string;
  objectiveId: string | null;
  stem: string;
  choices: { letter: "A" | "B" | "C"; text: string; isCorrect: boolean }[];
  explanation: string;
  sourceNote: string | null;
  authoredBy: string | null;
  figureRef: string | null;
  figureSupplement: string | null;
  difficulty: number;
  reviewStatus: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** A question carrying one cannot be approved — the function refuses. */
  hasValueGap: boolean;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

const VALUE_GAP = "[CFI: confirm value]";

/** Does this account hold a reviewing role? Asked of the database, not assumed. */
export async function isReviewer(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("may_review_questions");

  if (error) {
    console.error("Could not check reviewer role:", { error: error.message });
    return false;
  }

  return data === true;
}

/**
 * The reviewer's name and certificate number, as it should appear against the
 * content they approve.
 *
 * Stored on the profile rather than passed in a URL, because a CFI works
 * through a queue over weeks and an inconsistent signature on safety content is
 * worse than a slightly larger schema. Self-declared and never verified — it
 * grants nothing, since `role` is what decides who may review.
 *
 * Fails soft to null: an unreadable credential means the reviewer is asked to
 * type one, which is the state before this column existed.
 */
export async function loadReviewerCredential(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("reviewer_credential")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not read reviewer credential:", {
      userId,
      error: error.message,
    });
    return null;
  }

  const value = data?.reviewer_credential;

  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** Written with the reviewer's own client — it is their own profile row. */
export async function saveReviewerCredential(
  supabase: SupabaseClient,
  userId: string,
  credential: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ reviewer_credential: credential.trim() || null })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function loadReviewQueue(
  admin: SupabaseClient,
  status: string,
  limit = 50,
): Promise<ReviewableQuestion[]> {
  const { data, error } = await admin
    .from("question_bank")
    .select(
      "id, source_key, acs_code, knowledge_area, objective_id, stem, choice_a, choice_b, choice_c, correct_choice, explanation, source_note, authored_by, figure_ref, figure_supplement, difficulty, review_status, review_note, reviewed_by, reviewed_at",
    )
    .eq("review_status", status)
    .order("acs_code")
    .order("source_key")
    .limit(limit);

  if (error) {
    throw new Error(`review queue: ${error.message}`);
  }

  const questions: ReviewableQuestion[] = [];

  for (const row of (data ?? []) as Row[]) {
    const id = text(row.id);
    const stem = text(row.stem);
    const acsCode = text(row.acs_code);
    const knowledgeArea = text(row.knowledge_area);
    const explanation = text(row.explanation);
    const correct = text(row.correct_choice);

    if (
      !id ||
      !stem ||
      !acsCode ||
      !knowledgeArea ||
      !explanation ||
      !correct
    ) {
      continue;
    }

    const choices = (["A", "B", "C"] as const).map((letter) => ({
      letter,
      text: text(row[`choice_${letter.toLowerCase()}` as keyof Row]) ?? "",
      isCorrect: correct === letter,
    }));

    const all = [stem, explanation, ...choices.map((choice) => choice.text)];

    questions.push({
      id,
      sourceKey: text(row.source_key),
      acsCode,
      knowledgeArea,
      objectiveId: text(row.objective_id),
      stem,
      choices,
      explanation,
      sourceNote: text(row.source_note),
      authoredBy: text(row.authored_by),
      figureRef: text(row.figure_ref),
      figureSupplement: text(row.figure_supplement),
      difficulty: typeof row.difficulty === "number" ? row.difficulty : 2,
      reviewStatus: text(row.review_status) ?? "draft",
      reviewNote: text(row.review_note),
      reviewedBy: text(row.reviewed_by),
      reviewedAt: text(row.reviewed_at),
      hasValueGap: all.some((value) => value.includes(VALUE_GAP)),
    });
  }

  return questions;
}

export type ReviewCounts = {
  draft: number;
  needs_changes: number;
  cfi_approved: number;
  retired: number;
};

export async function loadReviewCounts(
  admin: SupabaseClient,
): Promise<ReviewCounts> {
  const { data, error } = await admin
    .from("question_bank")
    .select("review_status");

  if (error) {
    throw new Error(`review counts: ${error.message}`);
  }

  const counts: ReviewCounts = {
    draft: 0,
    needs_changes: 0,
    cfi_approved: 0,
    retired: 0,
  };

  for (const row of (data ?? []) as Row[]) {
    const status = text(row.review_status);
    if (status && status in counts) {
      counts[status as keyof ReviewCounts] += 1;
    }
  }

  return counts;
}

/**
 * Records a decision.
 *
 * Goes through the caller's own client on purpose: `review_question` checks
 * the reviewing role from `auth.uid()`, so using the service role here would
 * bypass the only thing standing between a student and the approve button.
 */
export async function recordReview(
  supabase: SupabaseClient,
  questionId: string,
  decision: ReviewDecision,
  reviewer: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("review_question", {
    p_question_id: questionId,
    p_decision: decision,
    p_reviewer: reviewer,
    p_note: note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
