import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  LearningObjective,
  Lesson,
  LessonSource,
  Stage,
} from "@/lib/curriculum";

/**
 * Lesson content, read from the database.
 *
 * Since 0018 the database is the source of truth for stages, lessons and
 * objectives, edited in the Supabase Table Editor. This module assembles those
 * rows into the same Stage / Lesson shape the rest of the app always used, so
 * the tutor, mastery notes, starters and lesson rows did not have to change.
 *
 * Reads with the caller's client: signed-in users may read stages, lessons and
 * active objectives under RLS. Retired objectives are never included.
 *
 * A failed read throws rather than returning an empty curriculum. An empty
 * list would render as "this lesson does not exist" or a dashboard with no
 * lessons — a database outage disguised as missing content.
 */

const SOURCES: readonly string[] = ["PHAK", "AFH", "AIM", "14 CFR"];

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function rows(result: { data: unknown; error: { message: string } | null }, label: string): Row[] {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return Array.isArray(result.data) ? (result.data as Row[]) : [];
}

export async function loadCurriculum(client: SupabaseClient): Promise<Stage[]> {
  const [stagesResult, lessonsResult, objectivesResult] = await Promise.all([
    client
      .from("curriculum_stages")
      .select("slug, number, title, tagline, goal, outline")
      .order("number"),
    client
      .from("curriculum_lessons")
      .select(
        "slug, stage_slug, position, title, objective, summary, sources, acs_areas, topic, history_card_id, estimated_minutes",
      )
      .order("position")
      .order("slug"),
    client
      .from("learning_objectives")
      .select("id, lesson_slug, text, is_safety_critical")
      .is("retired_at", null)
      .order("position")
      .order("id"),
  ]);

  const objectivesByLesson = new Map<string, LearningObjective[]>();
  for (const row of rows(objectivesResult, "learning objectives")) {
    const id = text(row.id);
    const lessonSlug = text(row.lesson_slug);
    const objectiveText = text(row.text);
    if (!id || !lessonSlug || objectiveText === null) continue;

    const list = objectivesByLesson.get(lessonSlug) ?? [];
    list.push({
      id,
      text: objectiveText,
      isSafetyCritical: row.is_safety_critical === true,
    });
    objectivesByLesson.set(lessonSlug, list);
  }

  const lessonsByStage = new Map<string, Lesson[]>();
  for (const row of rows(lessonsResult, "curriculum lessons")) {
    const slug = text(row.slug);
    const stageSlug = text(row.stage_slug);
    const title = text(row.title);
    const objective = text(row.objective);
    const summary = text(row.summary);
    const topic = text(row.topic);
    if (!slug || !stageSlug || !title || objective === null || summary === null || topic === null) {
      continue;
    }

    const list = lessonsByStage.get(stageSlug) ?? [];
    list.push({
      slug,
      title,
      objective,
      summary,
      objectives: objectivesByLesson.get(slug) ?? [],
      sources: textList(row.sources).filter(
        (source): source is LessonSource => SOURCES.includes(source),
      ),
      acsAreas: textList(row.acs_areas),
      topic,
      historyCardId: text(row.history_card_id) ?? undefined,
      estimatedMinutes:
        typeof row.estimated_minutes === "number" ? row.estimated_minutes : 0,
    });
    lessonsByStage.set(stageSlug, list);
  }

  const stages: Stage[] = [];
  for (const row of rows(stagesResult, "curriculum stages")) {
    const slug = text(row.slug);
    const title = text(row.title);
    const tagline = text(row.tagline);
    const goal = text(row.goal);
    if (!slug || !title || tagline === null || goal === null || typeof row.number !== "number") {
      continue;
    }

    const outline = textList(row.outline);
    stages.push({
      slug,
      number: row.number,
      title,
      tagline,
      goal,
      lessons: lessonsByStage.get(slug) ?? [],
      outline: outline.length > 0 ? outline : undefined,
    });
  }

  return stages;
}

export function findLesson(
  stages: Stage[],
  stageSlug: string,
  lessonSlug: string,
): { stage: Stage; lesson: Lesson } | undefined {
  const stage = stages.find((item) => item.slug === stageSlug);
  const lesson = stage?.lessons.find((item) => item.slug === lessonSlug);
  return stage && lesson ? { stage, lesson } : undefined;
}

/**
 * One lesson with its whole stage. The stage's full lesson list is part of
 * the answer on purpose: the tutor's mastery notes count progress across it.
 */
export async function loadLesson(
  client: SupabaseClient,
  stageSlug: string,
  lessonSlug: string,
): Promise<{ stage: Stage; lesson: Lesson } | undefined> {
  return findLesson(await loadCurriculum(client), stageSlug, lessonSlug);
}

/** The stage a lesson belongs to, or null if no such lesson exists. */
export async function findLessonStageSlug(
  client: SupabaseClient,
  lessonSlug: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("curriculum_lessons")
    .select("stage_slug")
    .eq("slug", lessonSlug)
    .maybeSingle();

  if (error) {
    throw new Error(`curriculum lesson lookup: ${error.message}`);
  }

  return typeof data?.stage_slug === "string" ? data.stage_slug : null;
}
