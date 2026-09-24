"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  recordReview,
  saveReviewerCredential,
  type ReviewDecision,
} from "@/lib/practice/review";
import type { AuthState } from "@/app/(auth)/actions";

const DECISIONS: readonly ReviewDecision[] = [
  "approve",
  "needs_changes",
  "retire",
];

function isDecision(value: string): value is ReviewDecision {
  return (DECISIONS as readonly string[]).includes(value);
}

/**
 * Saves how this reviewer should be named against content they approve.
 *
 * Shared by both review pages, and used directly as a form action rather than
 * through useActionState: there is nothing to report but the saved value, which
 * the re-rendered form shows. That keeps the name box working with no client
 * JavaScript, which matters on the cheap phones this audience uses.
 */
export async function setReviewerName(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const credential = String(formData.get("credential") ?? "");

  try {
    await saveReviewerCredential(supabase, user.id, credential);
  } catch (error) {
    // Losing a name is not worth failing the page over — the reviewer is asked
    // for it again, and no decision can be recorded without one.
    console.error("Could not save reviewer credential:", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  revalidatePath("/review");
  revalidatePath("/review/cards");
}

/**
 * One reviewer's decision on one question.
 *
 * Deliberately uses the reviewer's own client rather than the service role:
 * `review_question` reads `auth.uid()` to check the reviewing role, and the
 * service role would sail straight past that check. The page showing a button
 * is not what makes someone a reviewer.
 */
export async function reviewQuestion(
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

  const questionId = String(formData.get("questionId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!questionId || !isDecision(decision)) {
    return { error: "Nothing was recorded." };
  }

  if (!reviewer) {
    return {
      error:
        "Put your name and certificate number in the box first — an approval is a person, not a click.",
    };
  }

  try {
    await recordReview(
      supabase,
      questionId,
      decision,
      reviewer,
      note || undefined,
    );
  } catch (error) {
    // The function raises with wording meant for the reviewer — a missing
    // note, a value gap still in the text, the wrong role. Pass it through
    // rather than replacing it with something vaguer.
    const message = error instanceof Error ? error.message : String(error);

    console.error("Question review failed:", {
      userId: user.id,
      questionId,
      decision,
      error: message,
    });

    return { error: message };
  }

  revalidatePath("/review");

  return {
    message:
      decision === "approve"
        ? "Approved. It can now be served to students."
        : decision === "needs_changes"
          ? "Sent back with your note."
          : "Retired. It will not be served again.",
  };
}
