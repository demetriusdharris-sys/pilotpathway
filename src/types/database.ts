export type LessonStatus = "not_started" | "in_progress" | "completed";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type LessonProgress = {
  id: string;
  user_id: string;
  lesson_slug: string;
  status: LessonStatus;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};
