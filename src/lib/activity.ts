import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * What has actually been happening, for the admin page.
 *
 * `tutor_usage` has recorded a message count and a cost per student per day
 * since September and nothing has ever read it. Vercel keeps runtime logs
 * briefly and nobody watches them. So the questions a beta turns on — how many
 * students used this, how far do they get, what is it costing — could only be
 * answered by someone opening the SQL editor. For ten students you can ask them
 * directly. For thirty you cannot, and by then it is too late to instrument.
 *
 * AGGREGATE ONLY, DELIBERATELY. Every number here is a count or a total. There
 * is no per-student row and there must not be one: a screen listing what each
 * named student did, most of them minors, is a surveillance tool that nothing on
 * this page needs. The counts answer the operational question; a student's own
 * detail belongs to them, and to school staff only through consent.
 *
 * Read with the service role after `may_administer()` has answered true.
 */

export type ActivityWindow = {
  days: number;
  /** Students who sent at least one tutor message in the window. */
  activeStudents: number;
  tutorMessages: number;
  spendCents: number;
  practiceAttempts: number;
  quizAnswers: number;
  signups: number;
};

export type ActivityFunnel = {
  accounts: number;
  /** Sent at least one tutor message, ever. */
  started: number;
  /** Marked at least one lesson complete. */
  completedALesson: number;
  /** Has at least one scored quiz answer. */
  answeredAQuiz: number;
  /** Has at least one mastered objective. */
  showedAnObjective: number;
};

export type ActivityReport = {
  week: ActivityWindow;
  month: ActivityWindow;
  funnel: ActivityFunnel;
  allTimeSpendCents: number;
  /** The busiest single day so far, against the global cap. */
  busiestDay: { day: string; messages: number } | null;
  limits: { dailyPerUser: number | null; globalDaily: number | null };
  openReports: number;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // numeric(12,4) comes back as a string from PostgREST.
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function dayString(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

/** Distinct user ids in a set of rows, as a count. */
function distinctUsers(rows: Row[], column = "user_id"): number {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = text(row[column]);
    if (id) ids.add(id);
  }
  return ids.size;
}

export async function loadActivity(
  admin: SupabaseClient,
): Promise<ActivityReport> {
  const weekAgoDay = dayString(7);
  const monthAgoDay = dayString(30);
  const weekAgoStamp = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const monthAgoStamp = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // `tutor_usage` is one row per student per day, so a 30-day read is at most
  // thirty rows per active student. Small enough to total in JS, and totalling
  // here keeps the rule for "active" in one readable place.
  const [
    usageResult,
    profilesResult,
    progressResult,
    attemptsResult,
    assessmentsResult,
    masteryResult,
    limitsResult,
    reportsResult,
  ] = await Promise.all([
    admin
      .from("tutor_usage")
      .select("user_id, day, message_count, estimated_cost_cents"),
    admin.from("profiles").select("id, created_at"),
    admin.from("lesson_progress").select("user_id, status, completed_at"),
    admin.from("practice_attempts").select("user_id, started_at"),
    admin.from("objective_assessments").select("user_id, assessed_at"),
    admin.from("objective_mastery").select("user_id, is_mastered"),
    admin.from("usage_limits").select("key, value"),
    admin.from("content_reports").select("id").eq("status", "new"),
  ]);

  if (usageResult.error) {
    throw new Error(`activity usage: ${usageResult.error.message}`);
  }

  const usage = (usageResult.data ?? []) as Row[];
  const profiles = (profilesResult.data ?? []) as Row[];
  const progress = (progressResult.data ?? []) as Row[];
  const attempts = (attemptsResult.data ?? []) as Row[];
  const assessments = (assessmentsResult.data ?? []) as Row[];
  const mastery = (masteryResult.data ?? []) as Row[];

  const windowFor = (days: number, sinceDay: string, sinceStamp: string) => {
    const usageRows = usage.filter((row) => (text(row.day) ?? "") >= sinceDay);

    return {
      days,
      activeStudents: distinctUsers(
        usageRows.filter((row) => number(row.message_count) > 0),
      ),
      tutorMessages: usageRows.reduce(
        (sum, row) => sum + number(row.message_count),
        0,
      ),
      spendCents: usageRows.reduce(
        (sum, row) => sum + number(row.estimated_cost_cents),
        0,
      ),
      practiceAttempts: attempts.filter(
        (row) => (text(row.started_at) ?? "") >= sinceStamp,
      ).length,
      quizAnswers: assessments.filter(
        (row) => (text(row.assessed_at) ?? "") >= sinceStamp,
      ).length,
      signups: profiles.filter(
        (row) => (text(row.created_at) ?? "") >= sinceStamp,
      ).length,
    };
  };

  // Messages per day across everyone, to see how close the global cap has come.
  const byDay = new Map<string, number>();
  for (const row of usage) {
    const day = text(row.day);
    if (!day) continue;
    byDay.set(day, (byDay.get(day) ?? 0) + number(row.message_count));
  }

  let busiestDay: ActivityReport["busiestDay"] = null;
  for (const [day, messages] of byDay) {
    if (!busiestDay || messages > busiestDay.messages) {
      busiestDay = { day, messages };
    }
  }

  const limits: ActivityReport["limits"] = {
    dailyPerUser: null,
    globalDaily: null,
  };
  for (const row of (limitsResult.data ?? []) as Row[]) {
    const key = text(row.key);
    if (key === "daily_messages_per_user")
      limits.dailyPerUser = number(row.value);
    if (key === "global_daily_messages") limits.globalDaily = number(row.value);
  }

  return {
    week: windowFor(7, weekAgoDay, weekAgoStamp),
    month: windowFor(30, monthAgoDay, monthAgoStamp),
    funnel: {
      accounts: profiles.length,
      started: distinctUsers(
        usage.filter((row) => number(row.message_count) > 0),
      ),
      completedALesson: distinctUsers(
        progress.filter((row) => text(row.status) === "completed"),
      ),
      answeredAQuiz: distinctUsers(assessments),
      showedAnObjective: distinctUsers(
        mastery.filter((row) => row.is_mastered === true),
      ),
    },
    allTimeSpendCents: usage.reduce(
      (sum, row) => sum + number(row.estimated_cost_cents),
      0,
    ),
    busiestDay,
    limits,
    openReports: (reportsResult.data ?? []).length,
  };
}
