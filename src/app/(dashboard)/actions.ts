"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findLessonStageSlug } from "@/lib/curriculum-store";
import type { LessonStatus } from "@/types/database";

const VALID_STATUSES: LessonStatus[] = [
  "not_started",
  "in_progress",
  "completed",
];

export type ProgressState = { error?: string };

export async function setLessonStatus(
  _prevState: ProgressState,
  formData: FormData,
): Promise<ProgressState> {
  const lessonSlug = String(formData.get("lessonSlug") ?? "");
  const status = String(formData.get("status") ?? "") as LessonStatus;

  // Never trust the form: the status must be one we defined and the slug must
  // be a real lesson, or the write is refused.
  if (!VALID_STATUSES.includes(status)) {
    return { error: "That is not a valid status." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Log in again to save your progress." };
  }

  let stageSlug: string | null;
  try {
    stageSlug = await findLessonStageSlug(supabase, lessonSlug);
  } catch {
    return { error: "Could not save your progress. Try again." };
  }

  if (!stageSlug) {
    return { error: "That lesson does not exist." };
  }

  const now = new Date().toISOString();

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_slug: lessonSlug,
      status,
      started_at: status === "not_started" ? null : now,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id,lesson_slug" },
  );

  if (error) {
    return { error: "Could not save your progress. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/stages/${stageSlug}/${lessonSlug}`);

  return {};
}
