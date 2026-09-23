"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PracticeError,
  saveSelection,
  startAttempt,
  submitAttempt,
  type PracticeMode,
} from "@/lib/practice/attempts";
import type { AuthState } from "@/app/(auth)/actions";

const MODES: readonly PracticeMode[] = ["full_60", "quick_20", "targeted"];

function isMode(value: string): value is PracticeMode {
  return (MODES as readonly string[]).includes(value);
}

/**
 * Every action here re-reads the student from the session and passes that id
 * down. Nothing takes a user id from a form — an attempt id in a URL is not
 * evidence of whose attempt it is, and the lookups are scoped by both.
 */
async function requireStudent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  if (!user || !admin) {
    return null;
  }

  return { supabase, admin, user };
}

export async function beginPracticeTest(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await requireStudent();

  if (!session) {
    return { error: "Please log in again." };
  }

  const mode = String(formData.get("mode") ?? "");
  const target = String(formData.get("target") ?? "").trim() || undefined;

  if (!isMode(mode)) {
    return { error: "Pick a kind of test to start." };
  }

  let attemptId: string;

  try {
    attemptId = await startAttempt(
      session.supabase,
      session.admin,
      session.user.id,
      mode,
      target,
    );
  } catch (error) {
    if (error instanceof PracticeError) {
      return { error: error.message };
    }

    console.error("Failed to start a practice test:", {
      userId: session.user.id,
      mode,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "We could not start that test just now. Try again." };
  }

  redirect(`/practice/${attemptId}`);
}

/**
 * Saves a single selection. Called on every tap, so it stays small and says
 * plainly whether it stuck — the client shows an unsaved marker until it does.
 */
export async function savePracticeAnswer(input: {
  attemptId: string;
  questionPosition: number;
  choicePosition: number | null;
  secondsSpent?: number;
}): Promise<{ saved: boolean; error?: string }> {
  const session = await requireStudent();

  if (!session) {
    return { saved: false, error: "Please log in again." };
  }

  try {
    await saveSelection(
      session.admin,
      session.user.id,
      input.attemptId,
      input.questionPosition,
      input.choicePosition,
      input.secondsSpent,
    );
    return { saved: true };
  } catch (error) {
    if (error instanceof PracticeError) {
      return { saved: false, error: error.message };
    }

    console.error("Failed to save a practice answer:", {
      userId: session.user.id,
      attemptId: input.attemptId,
      position: input.questionPosition,
      error: error instanceof Error ? error.message : String(error),
    });
    return { saved: false, error: "That answer did not save." };
  }
}

export async function submitPracticeTest(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await requireStudent();

  if (!session) {
    return { error: "Please log in again." };
  }

  const attemptId = String(formData.get("attemptId") ?? "").trim();

  if (!attemptId) {
    return { error: "Nothing was submitted." };
  }

  try {
    await submitAttempt(session.admin, session.user.id, attemptId);
  } catch (error) {
    if (error instanceof PracticeError) {
      return { error: error.message };
    }

    console.error("Failed to submit a practice test:", {
      userId: session.user.id,
      attemptId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "We could not submit that test. Your answers are saved." };
  }

  revalidatePath("/practice");
  redirect(`/practice/${attemptId}/results`);
}
