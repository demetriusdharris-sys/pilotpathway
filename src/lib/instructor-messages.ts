import type { SupabaseClient } from "@supabase/supabase-js";
import type { TutorMessage } from "@/lib/tutor";

export type StoredMessage = TutorMessage & { createdAt: string };

/**
 * Loads a student's conversation for one lesson, oldest first.
 *
 * `limit` takes the most RECENT messages, which means ordering descending in
 * the query and reversing after. Ordering ascending with a limit would return
 * the oldest messages and the tutor would lose the thread it is actually in.
 */
export async function loadConversation(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string,
  limit: number,
): Promise<StoredMessage[]> {
  const { data, error } = await supabase
    .from("instructor_messages")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .eq("lesson_slug", lessonSlug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => ({
      role: row.role as TutorMessage["role"],
      content: row.content as string,
      createdAt: row.created_at as string,
    }))
    .reverse();
}

/** Total messages this student has exchanged in this lesson, for mastery hints. */
export async function countConversation(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("instructor_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("lesson_slug", lessonSlug);

  return error || count === null ? 0 : count;
}

export async function saveMessage(
  supabase: SupabaseClient,
  userId: string,
  lessonSlug: string,
  role: TutorMessage["role"],
  content: string,
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { error } = await supabase.from("instructor_messages").insert({
    user_id: userId,
    lesson_slug: lessonSlug,
    role,
    content: trimmed,
  });

  if (error) {
    console.error("Failed to save instructor message:", {
      role,
      lessonSlug,
      error: error.message,
    });
  }
}
