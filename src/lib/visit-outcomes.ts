import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCurriculum } from "@/lib/curriculum-store";

/**
 * What came of a classroom visit.
 *
 * The sentence a sponsor renews on is "your funded visit produced 14 signups,
 * 9 of whom finished Stage 1", and until now nothing in the app could produce
 * the second half of it. `visit_signups` knows who a visit reached; this joins
 * that to what those students then did.
 *
 * AGGREGATE ONLY, AND THERE MUST NEVER BE A PER-STUDENT ROW. Counts leave this
 * module and ids do not. The same rule as `/admin`, for the same reason: a
 * screen listing what each named student did, most of them minors, is a
 * surveillance tool, and nothing a sponsor needs requires one.
 *
 * ATTRIBUTION IS NOT CONSENT, which is exactly why this reads with the service
 * role rather than the caller's client. A student who typed a code has not
 * agreed to let that school or that pilot read their progress, and `0021`'s
 * policies correctly refuse it. What they can be part of is a number that
 * identifies nobody — which is what the business rules have said since `0006`:
 * aggregate reporting by default, no individual identifiable unless they opted
 * in. The caller is responsible for establishing that the reader is entitled to
 * the VISIT; this module then refuses to say anything about an individual.
 *
 * THE THREE FIGURES ARE NOT THE SAME KIND OF FACT, and the UI must keep them
 * apart. "Unverified data in a sponsor report is a trust event you don't
 * recover from" is a founding rule, so:
 *
 *   * `started` is OBSERVED — they asked Captain Path something. We watched it
 *     happen; it cannot be self-declared.
 *   * `markedFirstStageComplete` is SELF-REPORTED. `lesson_progress` is one
 *     three-state flag a student sets themselves, and it is architectural debt
 *     #2 that it is nothing stronger. It must never be presented as verified.
 *   * `shownAnObjective` is SCORED — a quiz answer marked against an approved
 *     card, which is the only reportable stream `0009` recognises. It is the
 *     one a school or funder can lean on, and today it reads near zero because
 *     almost no card is approved. That is the CFI queue showing up in the
 *     numbers, and it should: a figure a sponsor asks about is more use than a
 *     note in a file.
 */

const PAGE = 1000;

/** How many ids a single `in (...)` filter carries. */
const CHUNK = 200;

/**
 * Below this many attributed students, no learning figure is reported at all.
 *
 * With one signup, "1 of 1 finished Stage 1" is a statement about a person, and
 * the teacher who was in the room can usually name them. A count stops being
 * aggregate when the group is small enough to point at, which is why
 * disclosure rules in education settings suppress small cells rather than
 * trusting that nobody will do the arithmetic. The signup count itself is still
 * shown: that is a fact about the visit, not about anybody's learning.
 */
export const MIN_COHORT = 5;

export type VisitOutcomes = {
  signups: number;
  /** True when there are too few students to say anything without pointing. */
  tooFewToReport: boolean;
  /** Observed: asked the tutor at least one question. */
  started: number | null;
  /** SELF-REPORTED: ticked every lesson in the first stage. */
  markedFirstStageComplete: number | null;
  /** SCORED: at least one objective shown on an approved quiz card. */
  shownAnObjective: number | null;
  /** The stage the completion figure refers to, named rather than numbered. */
  firstStageTitle: string | null;
};

const EMPTY: VisitOutcomes = {
  signups: 0,
  tooFewToReport: true,
  started: null,
  markedFirstStageComplete: null,
  shownAnObjective: null,
  firstStageTitle: null,
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Reads one column across however many pages Supabase needs.
 *
 * Supabase caps a request at 1,000 rows. A beta cohort is nowhere near that,
 * but a silently truncated read here would under-report a sponsor's number,
 * and a number that drifts down as a programme succeeds is worse than none.
 */
async function pagedRows(
  label: string,
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
): Promise<Row[]> {
  const out: Row[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);

    if (error) throw new Error(`${label}: ${error.message}`);

    const rows = Array.isArray(data) ? (data as Row[]) : [];
    out.push(...rows);

    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return out;
}

function chunked(ids: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(ids.slice(i, i + CHUNK));
  return out;
}

/**
 * Counts for one visit, or for a set of them rolled together.
 *
 * Pass a single id for one visit's panel, or every id a pilot or school is
 * entitled to for their running total. Rolling up is a union of students, not a
 * sum of counts, because one student is attributed to exactly one visit and
 * double counting them would inflate the only number anybody is going to quote.
 */
export async function loadVisitOutcomes(
  admin: SupabaseClient,
  visitIds: string[],
): Promise<VisitOutcomes> {
  if (visitIds.length === 0) return EMPTY;

  const signupRows: Row[] = [];
  for (const chunk of chunked(visitIds)) {
    signupRows.push(
      ...(await pagedRows("visit signups", (from, to) =>
        admin
          .from("visit_signups")
          .select("user_id")
          .in("visit_id", chunk)
          .range(from, to),
      )),
    );
  }

  const students = new Set<string>();
  for (const row of signupRows) {
    const id = text(row.user_id);
    if (id) students.add(id);
  }

  const signups = students.size;

  if (signups < MIN_COHORT) {
    return { ...EMPTY, signups, tooFewToReport: true };
  }

  const userIds = [...students];
  const chunks = chunked(userIds);

  // --- observed: they asked the tutor something ----------------------------
  const asked = new Set<string>();
  for (const chunk of chunks) {
    const rows = await pagedRows("tutor messages", (from, to) =>
      admin
        .from("instructor_messages")
        .select("user_id")
        .in("user_id", chunk)
        .eq("role", "user")
        .range(from, to),
    );
    for (const row of rows) {
      const id = text(row.user_id);
      if (id) asked.add(id);
    }
  }

  // --- self-reported: every lesson in the first stage ticked ---------------
  const stages = await loadCurriculum(admin);
  const firstStage = stages.find((stage) => stage.lessons.length > 0) ?? null;
  const stageSlugs = new Set((firstStage?.lessons ?? []).map((l) => l.slug));

  const completedBy = new Map<string, Set<string>>();
  for (const chunk of chunks) {
    const rows = await pagedRows("lesson progress", (from, to) =>
      admin
        .from("lesson_progress")
        .select("user_id, lesson_slug")
        .in("user_id", chunk)
        .eq("status", "completed")
        .range(from, to),
    );
    for (const row of rows) {
      const id = text(row.user_id);
      const slug = text(row.lesson_slug);
      if (!id || !slug || !stageSlugs.has(slug)) continue;
      const set = completedBy.get(id) ?? new Set<string>();
      set.add(slug);
      completedBy.set(id, set);
    }
  }

  let markedFirstStageComplete = 0;
  if (stageSlugs.size > 0) {
    for (const set of completedBy.values()) {
      if (set.size >= stageSlugs.size) markedFirstStageComplete += 1;
    }
  }

  // --- scored: an objective shown against an approved card -----------------
  const shown = new Set<string>();
  for (const chunk of chunks) {
    const rows = await pagedRows("objective mastery", (from, to) =>
      admin
        .from("objective_mastery")
        .select("user_id")
        .in("user_id", chunk)
        .eq("is_mastered", true)
        .range(from, to),
    );
    for (const row of rows) {
      const id = text(row.user_id);
      if (id) shown.add(id);
    }
  }

  return {
    signups,
    tooFewToReport: false,
    started: asked.size,
    markedFirstStageComplete,
    shownAnObjective: shown.size,
    firstStageTitle: firstStage?.title ?? null,
  };
}

/**
 * The same figures, never throwing.
 *
 * A visit page that will not render because a progress table was briefly
 * unreachable is worse than one showing the visit without its outcome panel.
 * The signup count on the page comes from elsewhere and survives this.
 */
export async function loadVisitOutcomesSoft(
  admin: SupabaseClient,
  visitIds: string[],
): Promise<VisitOutcomes | null> {
  try {
    return await loadVisitOutcomes(admin, visitIds);
  } catch (error) {
    console.error("Visit outcomes unavailable:", {
      error: error instanceof Error ? error.message : String(error),
      visits: visitIds.length,
    });
    return null;
  }
}
