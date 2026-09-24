"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createReport,
  ReportError,
  type ReportSubjectKind,
} from "@/lib/content-reports";
import type { AuthState } from "@/app/(auth)/actions";

const KINDS: readonly ReportSubjectKind[] = [
  "quiz_card",
  "practice_question",
  "tutor_message",
];

function isKind(value: string): value is ReportSubjectKind {
  return (KINDS as readonly string[]).includes(value);
}

/**
 * A student says something looks wrong.
 *
 * Shared by the lesson quiz, the practice results page and the tutor chat, so it
 * lives in its own folder rather than beside any one of them.
 *
 * The subject id comes from the form, which means a determined student could
 * report a card they were never shown. That is deliberately not defended
 * against: the cost is a spurious row in a table a person reads, and checking it
 * would mean three more database round trips on a path whose entire purpose is
 * being easy to use. Nothing here grants access to anything.
 */
export async function reportProblem(
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

  const admin = createAdminClient();

  if (!admin) {
    console.error("Content report dropped: no service role key.");
    return {
      error: "We could not send that just now. Please try again.",
    };
  }

  const subjectKind = String(formData.get("subjectKind") ?? "");
  const subjectId = String(formData.get("subjectId") ?? "").trim();
  const lessonSlug = String(formData.get("lessonSlug") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "");
  const reason = String(formData.get("reason") ?? "");

  // A tutor reply arrives with no id — the server derives one from its text.
  if (!isKind(subjectKind) || (!subjectId && subjectKind !== "tutor_message")) {
    return { error: "We could not tell what that was about." };
  }

  try {
    await createReport(admin, {
      reporterUserId: user.id,
      subjectKind,
      subjectId,
      lessonSlug: lessonSlug || null,
      excerpt: excerpt || null,
      reason,
    });
  } catch (error) {
    if (error instanceof ReportError) {
      return { error: error.message };
    }

    console.error("Content report failed:", {
      userId: user.id,
      subjectKind,
      error: error instanceof Error ? error.message : String(error),
    });

    return { error: "We could not send that just now. Please try again." };
  }

  // Deliberately no revalidatePath. Nothing on the page changes, and reloading
  // a lesson or a results page underneath a student who just typed something
  // would be a strange reward for helping.
  return {
    message: "Thank you — a person will read this.",
  };
}
