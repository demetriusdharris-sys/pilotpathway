import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { MAX_REASON_CHARS } from "@/lib/report-limits";

/**
 * Student reports that something looks wrong.
 *
 * Written with the service role after the caller is authenticated, which is what
 * lets the daily cap and the duplicate check live in one place. A student
 * inserting directly could also set `status` or `triage_note`, and a report that
 * arrives pre-triaged is worse than no report.
 *
 * Nothing here changes the state of the content being reported. That is the
 * whole design: a report is a claim, and a report that unapproved a card would
 * let any student remove it from everyone else.
 */

export type ReportSubjectKind =
  "quiz_card" | "practice_question" | "tutor_message";

/**
 * Enough that nobody hits it in good faith, low enough that a script cannot
 * fill the table. The duplicate index already stops the common case — the same
 * complaint about the same item over and over.
 */
const MAX_REPORTS_PER_DAY = 20;

/** Truncated rather than rejected: a long quote is still a usable report. */
const MAX_EXCERPT_CHARS = 1000;

/**
 * A stable id for a piece of generated text.
 *
 * A tutor reply has no id the browser could send, so its identity is its
 * content. Truncated to 32 hex characters: this is a dedup key, not a security
 * boundary, and a shorter one reads better in the SQL Editor.
 */
function contentFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

export type ContentReport = {
  id: number;
  reporterUserId: string | null;
  reporterEmail: string | null;
  subjectKind: ReportSubjectKind;
  subjectId: string;
  lessonSlug: string | null;
  subjectExcerpt: string | null;
  reason: string;
  status: string;
  triageNote: string | null;
  createdAt: string;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export class ReportError extends Error {}

/**
 * Files a report.
 *
 * Throws `ReportError` with wording meant for the student. Everything it can
 * refuse is something they can act on: an empty reason, one they have already
 * sent, or too many in a day.
 */
export async function createReport(
  admin: SupabaseClient,
  input: {
    reporterUserId: string;
    subjectKind: ReportSubjectKind;
    subjectId: string;
    lessonSlug?: string | null;
    excerpt?: string | null;
    reason: string;
  },
): Promise<void> {
  const reason = input.reason.trim();

  if (reason.length === 0) {
    throw new ReportError("Tell us what looks wrong first.");
  }

  if (reason.length > MAX_REASON_CHARS) {
    throw new ReportError(
      "That is longer than we can take — try the short version.",
    );
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { count, error: countError } = await admin
    .from("content_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_user_id", input.reporterUserId)
    .gte("created_at", since);

  if (countError) {
    throw new ReportError("We could not send that just now. Please try again.");
  }

  if ((count ?? 0) >= MAX_REPORTS_PER_DAY) {
    throw new ReportError(
      "You have sent a lot of reports today — thank you. Email demetrius@pilotpathway.ai with the rest and we will read them.",
    );
  }

  const excerpt = input.excerpt?.trim().slice(0, MAX_EXCERPT_CHARS) || null;

  // A tutor reply has no id, so it is identified by its own text. Done here
  // rather than in the browser so the hash cannot be chosen by the caller.
  const subjectId =
    input.subjectId ||
    (input.subjectKind === "tutor_message" && excerpt
      ? contentFingerprint(excerpt)
      : "");

  if (!subjectId) {
    throw new ReportError("We could not tell what that was about.");
  }

  const { error } = await admin.from("content_reports").insert({
    reporter_user_id: input.reporterUserId,
    subject_kind: input.subjectKind,
    subject_id: subjectId,
    lesson_slug: input.lessonSlug ?? null,
    subject_excerpt: excerpt,
    reason,
  });

  if (error) {
    // 23505 is the one-per-person index. Said plainly rather than as a failure:
    // they did the right thing and we already have it.
    if (error.code === "23505") {
      throw new ReportError(
        "You have already reported this one — it is on the list.",
      );
    }

    console.error("Could not save a content report:", {
      userId: input.reporterUserId,
      subjectKind: input.subjectKind,
      error: error.message,
    });

    throw new ReportError("We could not send that just now. Please try again.");
  }
}

export async function loadReports(
  admin: SupabaseClient,
  status = "new",
  limit = 50,
): Promise<ContentReport[]> {
  const { data, error } = await admin
    .from("content_reports")
    .select(
      "id, reporter_user_id, subject_kind, subject_id, lesson_slug, subject_excerpt, reason, status, triage_note, created_at",
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`content reports: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];

  // Reporter emails in one read rather than one per row. A report with no
  // reporter is one whose author deleted their account; the correction stands.
  const reporterIds = [
    ...new Set(
      rows
        .map((row) => text(row.reporter_user_id))
        .filter((id): id is string => id !== null),
    ),
  ];

  const emailById = new Map<string, string>();

  if (reporterIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", reporterIds);

    for (const row of (profiles ?? []) as Row[]) {
      const id = text(row.id);
      const email = text(row.email);
      if (id && email) emailById.set(id, email);
    }
  }

  const reports: ContentReport[] = [];

  for (const row of rows) {
    const subjectKind = text(row.subject_kind);
    const subjectId = text(row.subject_id);
    const reason = text(row.reason);

    if (!subjectKind || !subjectId || !reason) continue;
    if (typeof row.id !== "number") continue;

    const reporterUserId = text(row.reporter_user_id);

    reports.push({
      id: row.id,
      reporterUserId,
      reporterEmail: reporterUserId
        ? (emailById.get(reporterUserId) ?? null)
        : null,
      subjectKind: subjectKind as ReportSubjectKind,
      subjectId,
      lessonSlug: text(row.lesson_slug),
      subjectExcerpt: text(row.subject_excerpt),
      reason,
      status: text(row.status) ?? "new",
      triageNote: text(row.triage_note),
      createdAt: text(row.created_at) ?? "",
    });
  }

  return reports;
}

export async function countReportsByStatus(
  admin: SupabaseClient,
): Promise<Record<string, number>> {
  const { data, error } = await admin.from("content_reports").select("status");

  if (error) {
    throw new Error(`content report counts: ${error.message}`);
  }

  const counts: Record<string, number> = {
    new: 0,
    triaged: 0,
    actioned: 0,
    dismissed: 0,
  };

  for (const row of (data ?? []) as Row[]) {
    const status = text(row.status);
    if (status && status in counts) counts[status] += 1;
  }

  return counts;
}

/** Triage. Service role, after the caller has been checked as an admin. */
export async function setReportStatus(
  admin: SupabaseClient,
  id: number,
  status: "triaged" | "actioned" | "dismissed",
  note?: string,
): Promise<void> {
  const { error } = await admin
    .from("content_reports")
    .update({
      status,
      triage_note: note?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
