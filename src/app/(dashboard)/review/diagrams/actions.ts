"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recordDiagramReview } from "@/lib/diagrams/review";
import type { AuthState } from "@/app/(auth)/actions";

const DECISIONS = ["approve", "needs_changes", "retire"] as const;

type Decision = (typeof DECISIONS)[number];

function isDecision(value: string): value is Decision {
  return (DECISIONS as readonly string[]).includes(value);
}

/**
 * One reviewer's decision on one diagram.
 *
 * The reviewer's own client, because `review_diagram` reads `auth.uid()` to
 * check the reviewing role. Same reasoning as the cards: a page showing a button
 * is not what makes somebody a reviewer.
 */
export async function reviewDiagram(
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

  const key = String(formData.get("diagramKey") ?? "").trim();
  const decision = String(formData.get("decision") ?? "");
  const reviewer = String(formData.get("reviewer") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!key || !isDecision(decision)) {
    return { error: "Nothing was recorded." };
  }

  if (!reviewer) {
    return {
      error:
        "Put your name and certificate number in the box first — an approval is a person, not a click.",
    };
  }

  try {
    await recordDiagramReview(
      supabase,
      key,
      decision,
      reviewer,
      note || undefined,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Diagram review failed:", {
      userId: user.id,
      key,
      decision,
      error: message,
    });

    return { error: message };
  }

  revalidatePath("/review/diagrams");

  return {
    message:
      decision === "approve"
        ? "Approved. Students will see it on the lesson."
        : decision === "needs_changes"
          ? "Sent back with your note."
          : "Cut. It will not be shown again.",
  };
}
