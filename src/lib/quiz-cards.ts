import type { SupabaseClient } from "@supabase/supabase-js";

export type QuizOption = {
  optionId: string;
  text: string;
};

export type QuizCard = {
  id: string;
  objectiveId: string;
  lessonSlug: string;
  question: string;
  /** Already shuffled. Nothing may depend on this order. */
  options: QuizOption[];
};

/**
 * Loads the approved cards for a lesson, with their options shuffled.
 *
 * Reads with the caller's own client. Two separate controls make this safe,
 * and neither is a convention someone has to remember:
 *
 *   - The RLS policy from 0014 returns only cards whose status is 'approved'.
 *     A draft card cannot be selected at all, so an unreviewed question about
 *     a safety-critical objective cannot reach a student by accident.
 *   - The column GRANT from 0014 means is_correct and explanation are not
 *     selectable by an authenticated user. Asking for them returns 42501.
 *     That is why this function cannot return the answer even if it tried.
 *
 * Grading therefore has to happen server-side with the service role. If the
 * correct option id ever reached the browser, objective_assessments would stop
 * being worth showing anyone.
 */
export async function loadApprovedCards(
  supabase: SupabaseClient,
  lessonSlug: string,
): Promise<QuizCard[]> {
  const { data: cards, error: cardError } = await supabase
    .from("quiz_cards")
    .select("id, objective_id, lesson_slug, position, question")
    .eq("lesson_slug", lessonSlug)
    .order("objective_id", { ascending: true })
    .order("position", { ascending: true });

  if (cardError || !cards || cards.length === 0) {
    if (cardError) {
      console.error("Failed to load quiz cards:", {
        lessonSlug,
        error: cardError.message,
      });
    }
    return [];
  }

  const ids = cards
    .map((row) => row.id)
    .filter((id): id is string => typeof id === "string");

  const { data: options, error: optionError } = await supabase
    .from("quiz_card_options")
    .select("card_id, option_id, text")
    .in("card_id", ids);

  if (optionError || !options) {
    if (optionError) {
      console.error("Failed to load quiz card options:", {
        lessonSlug,
        error: optionError.message,
      });
    }
    return [];
  }

  const byCard = new Map<string, QuizOption[]>();
  for (const row of options) {
    const cardId = row.card_id;
    const optionId = row.option_id;
    const text = row.text;

    if (
      typeof cardId !== "string" ||
      typeof optionId !== "string" ||
      typeof text !== "string"
    ) {
      continue;
    }

    const list = byCard.get(cardId) ?? [];
    list.push({ optionId, text });
    byCard.set(cardId, list);
  }

  const built: QuizCard[] = [];

  for (const row of cards) {
    const id = row.id;
    const objectiveId = row.objective_id;
    const question = row.question;

    if (
      typeof id !== "string" ||
      typeof objectiveId !== "string" ||
      typeof question !== "string"
    ) {
      continue;
    }

    const options = byCard.get(id);

    // A card with no readable options is not answerable. Drop it rather than
    // render a question with nothing to pick.
    if (!options || options.length < 2) {
      continue;
    }

    built.push({
      id,
      objectiveId,
      lessonSlug,
      question,
      options: shuffle(options),
    });
  }

  return built;
}

/**
 * Fisher-Yates, on a copy.
 *
 * Runs on the server, once per render, and the resulting order is passed to
 * the client as data. Shuffling inside a client component would produce a
 * different order on the server pass and the client pass, which React reports
 * as a hydration mismatch.
 */
function shuffle(options: QuizOption[]): QuizOption[] {
  const copy = [...options];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}
