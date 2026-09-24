import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The quiz card review queue, for a CFI or an administrator.
 *
 * Reads with the service role **after** the caller's role has been checked.
 * A reviewer has to see which option is correct and read the explanation, and
 * `quiz_card_options.is_correct` and `quiz_cards.explanation` are granted to
 * nobody in the browser. Granting them so a reviewer could read them would
 * hand the answer key to every student — a GRANT is role-wide, and RLS
 * restricts rows rather than columns. That is 0014's bug exactly.
 *
 * Nothing here decides who may review. `review_card` asks the database again
 * before it writes: a page decides what to show, a function decides what may
 * happen.
 */

export type CardReviewDecision = "approve" | "needs_changes" | "retire";

export type ReviewableCard = {
  id: string;
  objectiveId: string;
  /** The objective's own words. A card is judged against what it assesses. */
  objectiveText: string | null;
  /** 16 of the 48 objectives are. A reviewer should know before approving. */
  objectiveIsSafetyCritical: boolean;
  lessonSlug: string;
  lessonTitle: string | null;
  position: number;
  question: string;
  options: { optionId: string; text: string; isCorrect: boolean }[];
  explanation: string;
  visualDescription: string | null;
  /** Our own doubt, from the card markdown. Does not block approval. */
  authorNote: string | null;
  status: string;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** A card carrying one cannot be approved — the function refuses. */
  hasValueGap: boolean;
};

type Row = Record<string, unknown>;

const VALUE_GAP = "[CFI: confirm value]";

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function loadCardReviewQueue(
  admin: SupabaseClient,
  status: string,
  lessonSlug?: string,
  limit = 200,
): Promise<ReviewableCard[]> {
  let query = admin
    .from("quiz_cards")
    .select(
      "id, objective_id, lesson_slug, position, question, explanation, visual_description, author_note, status, review_note, reviewed_by, reviewed_at",
    )
    .eq("status", status);

  if (lessonSlug) {
    query = query.eq("lesson_slug", lessonSlug);
  }

  const { data, error } = await query
    .order("lesson_slug")
    .order("objective_id")
    .order("position")
    .limit(limit);

  if (error) {
    throw new Error(`card review queue: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) return [];

  const cardIds = rows
    .map((row) => text(row.id))
    .filter((id): id is string => id !== null);

  const objectiveIds = Array.from(
    new Set(
      rows
        .map((row) => text(row.objective_id))
        .filter((id): id is string => id !== null),
    ),
  );

  const lessonSlugs = Array.from(
    new Set(
      rows
        .map((row) => text(row.lesson_slug))
        .filter((slug): slug is string => slug !== null),
    ),
  );

  // Options, objective wording and lesson titles in three reads rather than
  // one row per card. A CFI reviewing 144 cards should not wait on 432 queries.
  const [optionResult, objectiveResult, lessonResult] = await Promise.all([
    admin
      .from("quiz_card_options")
      .select("card_id, option_id, text, is_correct")
      .in("card_id", cardIds),
    admin
      .from("learning_objectives")
      .select("id, text, is_safety_critical")
      .in("id", objectiveIds),
    admin
      .from("curriculum_lessons")
      .select("slug, title")
      .in("slug", lessonSlugs),
  ]);

  if (optionResult.error) {
    throw new Error(`card review options: ${optionResult.error.message}`);
  }

  const optionsByCard = new Map<
    string,
    { optionId: string; text: string; isCorrect: boolean }[]
  >();

  for (const row of (optionResult.data ?? []) as Row[]) {
    const cardId = text(row.card_id);
    const optionId = text(row.option_id);
    const optionText = text(row.text);

    if (!cardId || !optionId || optionText === null) continue;

    const list = optionsByCard.get(cardId) ?? [];
    list.push({
      optionId,
      text: optionText,
      isCorrect: row.is_correct === true,
    });
    optionsByCard.set(cardId, list);
  }

  // Objective wording and lesson titles are context, not correctness. A failed
  // read leaves them null rather than hiding the card a CFI is waiting on.
  const objectiveText = new Map<string, string>();
  const safetyCritical = new Set<string>();
  for (const row of (objectiveResult.data ?? []) as Row[]) {
    const id = text(row.id);
    const value = text(row.text);
    if (id && value) objectiveText.set(id, value);
    // Fails toward "not marked" if the read failed, which is the honest
    // direction: a missing badge is a gap, a wrong badge is a false assurance.
    if (id && row.is_safety_critical === true) safetyCritical.add(id);
  }

  const lessonTitle = new Map<string, string>();
  for (const row of (lessonResult.data ?? []) as Row[]) {
    const slug = text(row.slug);
    const value = text(row.title);
    if (slug && value) lessonTitle.set(slug, value);
  }

  const cards: ReviewableCard[] = [];

  for (const row of rows) {
    const id = text(row.id);
    const objectiveId = text(row.objective_id);
    const lessonSlug = text(row.lesson_slug);
    const question = text(row.question);
    const explanation = text(row.explanation);

    if (!id || !objectiveId || !lessonSlug || !question || !explanation) {
      continue;
    }

    // Options keep their stored order here on purpose. This is not a student
    // sitting a quiz — a reviewer checking that exactly one option is right
    // wants the order the card document has, so the page and the markdown can
    // be read side by side.
    const options = (optionsByCard.get(id) ?? []).sort((a, b) =>
      a.optionId.localeCompare(b.optionId),
    );

    const visualDescription = text(row.visual_description);

    const all = [
      question,
      explanation,
      visualDescription ?? "",
      ...options.map((option) => option.text),
    ];

    cards.push({
      id,
      objectiveId,
      objectiveText: objectiveText.get(objectiveId) ?? null,
      objectiveIsSafetyCritical: safetyCritical.has(objectiveId),
      lessonSlug,
      lessonTitle: lessonTitle.get(lessonSlug) ?? null,
      position: typeof row.position === "number" ? row.position : 0,
      question,
      options,
      explanation,
      visualDescription,
      authorNote: text(row.author_note),
      status: text(row.status) ?? "draft",
      reviewNote: text(row.review_note),
      reviewedBy: text(row.reviewed_by),
      reviewedAt: text(row.reviewed_at),
      hasValueGap: all.some((value) => value.includes(VALUE_GAP)),
    });
  }

  return cards;
}

export type CardReviewCounts = {
  draft: number;
  needs_changes: number;
  approved: number;
  retired: number;
};

export async function loadCardReviewCounts(
  admin: SupabaseClient,
): Promise<CardReviewCounts> {
  const { data, error } = await admin.from("quiz_cards").select("status");

  if (error) {
    throw new Error(`card review counts: ${error.message}`);
  }

  const counts: CardReviewCounts = {
    draft: 0,
    needs_changes: 0,
    approved: 0,
    retired: 0,
  };

  for (const row of (data ?? []) as Row[]) {
    const status = text(row.status);
    if (status && status in counts) {
      counts[status as keyof CardReviewCounts] += 1;
    }
  }

  return counts;
}

/**
 * How many cards are in this queue, per lesson.
 *
 * 144 cards is more than anyone reviews in one sitting, so a CFI needs to see
 * where the work is and come back to it. Without this the queue is an
 * undifferentiated wall and there is no way to tell progress.
 */
export async function loadCardQueueByLesson(
  admin: SupabaseClient,
  status: string,
): Promise<{ lessonSlug: string; lessonTitle: string | null; count: number }[]> {
  const [cardResult, lessonResult] = await Promise.all([
    admin.from("quiz_cards").select("lesson_slug").eq("status", status),
    admin.from("curriculum_lessons").select("slug, title, position"),
  ]);

  if (cardResult.error) {
    throw new Error(`card queue by lesson: ${cardResult.error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of (cardResult.data ?? []) as Row[]) {
    const slug = text(row.lesson_slug);
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }

  const order = new Map<string, number>();
  const titles = new Map<string, string>();
  for (const row of (lessonResult.data ?? []) as Row[]) {
    const slug = text(row.slug);
    if (!slug) continue;
    const title = text(row.title);
    if (title) titles.set(slug, title);
    if (typeof row.position === "number") order.set(slug, row.position);
  }

  return Array.from(counts.entries())
    .map(([lessonSlug, count]) => ({
      lessonSlug,
      lessonTitle: titles.get(lessonSlug) ?? null,
      count,
    }))
    // Curriculum order, so a CFI works through them the way a student meets
    // them. A lesson missing from the curriculum read sorts last rather than
    // disappearing.
    .sort(
      (a, b) =>
        (order.get(a.lessonSlug) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.lessonSlug) ?? Number.MAX_SAFE_INTEGER) ||
        a.lessonSlug.localeCompare(b.lessonSlug),
    );
}

/**
 * Records a decision on one card.
 *
 * Goes through the caller's own client on purpose: `review_card` checks the
 * reviewing role from `auth.uid()`, so using the service role here would
 * bypass the only thing standing between a student and the approve button.
 */
export async function recordCardReview(
  supabase: SupabaseClient,
  cardId: string,
  decision: CardReviewDecision,
  reviewer: string,
  note?: string,
): Promise<void> {
  const { error } = await supabase.rpc("review_card", {
    p_card_id: cardId,
    p_decision: decision,
    p_reviewer: reviewer,
    p_note: note ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
