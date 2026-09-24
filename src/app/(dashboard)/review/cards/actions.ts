"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  recordCardReview,
  type CardReviewDecision,
} from "@/lib/card-review";
import type { AuthState } from "@/app/(auth)/actions";

const DECISIONS: readonly CardReviewDecision[] = [
  "approve",
  "needs_changes",
  "retire",
];

function isDecision(value: string): value is CardReviewDecision {
  return (DECISIONS as readonly string[]).includes(value);
}

/**
 * One reviewer's decision on one quiz card.
 *
 * Deliberately uses the reviewer's own client rather than the service role:
 * `review_card` reads `auth.uid()` to check the reviewing role, and the service
 * role would sail straight past that check. The page showing a button is not
 * what makes someone a reviewer.
 */
export async function reviewCard(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again." };
  }

  const cardId = String(formData.get("cardId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!cardId || !isDecision(decision)) {
    return { error: "Nothing was recorded." };
  }

  if (!reviewer) {
    return {
      error:
        "Put your name and certificate number in the box first — an approval is a person, not a click.",
    };
  }

  try {
    await recordCardReview(
      supabase,
      cardId,
      decision,
      reviewer,
      note || undefined,
    );
  } catch (error) {
    // The function raises with wording meant for the reviewer — a missing note,
    // an unanswered flag, a value gap still in the text, the wrong role. Pass
    // it through rather than replacing it with something vaguer.
    const message = error instanceof Error ? error.message : String(error);

    console.error("Card review failed:", {
      userId: user.id,
      cardId,
      decision,
      error: message,
    });

    return { error: message };
  }

  revalidatePath("/review/cards");

  return {
    message:
      decision === "approve"
        ? "Approved. Students will see this card on its lesson."
        : decision === "needs_changes"
          ? "Sent back with your note."
          : "Cut. It will not be shown again.",
  };
}
