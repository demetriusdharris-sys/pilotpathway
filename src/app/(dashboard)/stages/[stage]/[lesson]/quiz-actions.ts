"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AnswerState = {
  /** Which card this result belongs to, so a stale result is never shown. */
  cardId?: string;
  chosenOptionId?: string;
  isCorrect?: boolean;
  /** Released only after an answer. Never sent with the question. */
  explanation?: string;
  error?: string;
};

/**
 * Grades one answer and records it.
 *
 * The client posts the option id it chose and nothing else. Whether that was
 * right is decided here, by reading is_correct with the service role — the
 * column GRANT from 0014 means the browser cannot read it, so a student
 * cannot see the answer before choosing or check their work in devtools.
 *
 * The write goes through the service role too: objective_assessments has no
 * client INSERT policy by design. A student who can insert is_correct = true
 * has a mastery record that means nothing, and it is the only stream we would
 * ever put in front of a school.
 */
export async function submitAnswer(
  _prevState: AnswerState,
  formData: FormData,
): Promise<AnswerState> {
  const cardId = String(formData.get("cardId") ?? "").trim();
  const chosenOptionId = String(formData.get("optionId") ?? "").trim();

  if (!cardId || !chosenOptionId) {
    return { error: "Pick an answer first." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again." };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error("Quiz grading blocked: SUPABASE_SERVICE_ROLE_KEY is missing.");
    return {
      error:
        "We could not check that just now. This is on our side, not yours.",
    };
  }

  // Status is re-checked here, not just at render. A card withdrawn from
  // approval between the page loading and the student answering must not be
  // graded or recorded.
  const { data: card, error: cardError } = await admin
    .from("quiz_cards")
    .select("id, objective_id, lesson_slug, question, explanation, status")
    .eq("id", cardId)
    .maybeSingle();

  if (cardError || !card || card.status !== "approved") {
    if (cardError) {
      console.error("Quiz card lookup failed:", {
        cardId,
        error: cardError.message,
      });
    }
    return { error: "That question is not available any more." };
  }

  const { data: options, error: optionError } = await admin
    .from("quiz_card_options")
    .select("option_id, text, is_correct")
    .eq("card_id", cardId);

  if (optionError || !options || options.length === 0) {
    console.error("Quiz option lookup failed:", {
      cardId,
      error: optionError?.message ?? "no options",
    });
    return { error: "We could not check that just now. Try again." };
  }

  const chosen = options.find((row) => row.option_id === chosenOptionId);

  if (!chosen) {
    return { error: "That answer does not belong to this question." };
  }

  const isCorrect = chosen.is_correct === true;
  const objectiveId =
    typeof card.objective_id === "string" ? card.objective_id : null;
  const question = typeof card.question === "string" ? card.question : "";
  const explanation =
    typeof card.explanation === "string" ? card.explanation : "";

  if (objectiveId) {
    // Scored evidence. Append-only: every attempt is recorded, including
    // repeats, because the mastery view is what decides how they count.
    const { error: writeError } = await admin
      .from("objective_assessments")
      .insert({
        user_id: user.id,
        objective_id: objectiveId,
        is_correct: isCorrect,
        question_text: question,
        student_answer: typeof chosen.text === "string" ? chosen.text : null,
        lesson_slug:
          typeof card.lesson_slug === "string" ? card.lesson_slug : null,
      });

    if (writeError) {
      // The student still gets their answer. A lost record is worse than a
      // lost lesson, but not worth refusing to tell them how they did.
      console.error("Failed to record assessment:", {
        userId: user.id,
        cardId,
        error: writeError.message,
      });
    }
  }

  return { cardId, chosenOptionId, isCorrect, explanation };
}
