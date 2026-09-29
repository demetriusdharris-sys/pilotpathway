import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Classroom visits — a pilot speaking to a room of students.
 *
 * Every read here goes through the caller's own client, so the policies from
 * 0036 are what decide who sees what: staff see their school's visits, a
 * *verified* pilot sees open ones, and an unverified pilot sees no open visit at
 * all — they cannot volunteer, and showing them a list they cannot act on would
 * only teach them to try.
 *
 * Every write goes through a database function, because the rules are the value
 * of this feature: a visit cannot be confirmed with an unvetted pilot, and
 * attendance is reported by the school rather than the volunteer. None of that
 * belongs in a policy expression or in a page.
 *
 * Nothing in this module touches a student. A visit knows a school, a teacher, a
 * pilot, a date and a headcount.
 */

export const GRADE_LABEL: Record<string, string> = {
  k_5: "Kindergarten to 5th",
  "6_8": "6th to 8th",
  "9_12": "9th to 12th",
  mixed: "Mixed ages",
  college: "College",
};

export const STATUS_LABEL: Record<string, string> = {
  open: "Looking for a pilot",
  confirmed: "Confirmed",
  completed: "Done",
  cancelled: "Cancelled",
};

export type ClassroomVisit = {
  id: string;
  organizationId: string;
  organizationName: string | null;
  gradeLevel: string;
  subject: string | null;
  expectedStudents: number;
  format: "in_person" | "virtual";
  city: string | null;
  state: string | null;
  windowStart: string;
  windowEnd: string;
  confirmedFor: string | null;
  notes: string | null;
  status: "open" | "confirmed" | "completed" | "cancelled";
  pilotUserId: string | null;
  pilotName: string | null;
  studentsAttended: number | null;
  durationMinutes: number | null;
  cancelledReason: string | null;
  /** What the pilot puts on a slide. Null until the visit is confirmed. */
  code: string | null;
  volunteerCount: number;
};

export type VisitOffer = {
  id: number;
  pilotUserId: string;
  pilotName: string | null;
  pilotJobTitle: string | null;
  pilotGrewUpIn: string | null;
  message: string | null;
  offeredAt: string;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

const COLUMNS =
  "id, organization_id, requested_by, grade_level, subject, expected_students, format, city, state, window_start, window_end, confirmed_for, notes, status, pilot_user_id, students_attended, duration_minutes, cancelled_reason, code";

/**
 * Turns rows into visits, filling in the school name, the confirmed pilot's name
 * and how many pilots have offered.
 *
 * Names and counts are context rather than correctness — a failed lookup leaves
 * them null rather than hiding a visit somebody is waiting on.
 */
async function decorate(
  supabase: SupabaseClient,
  rows: Row[],
): Promise<ClassroomVisit[]> {
  if (rows.length === 0) return [];

  const ids = rows
    .map((row) => text(row.id))
    .filter((id): id is string => id !== null);

  const orgIds = [
    ...new Set(
      rows
        .map((row) => text(row.organization_id))
        .filter((id): id is string => id !== null),
    ),
  ];

  const pilotIds = [
    ...new Set(
      rows
        .map((row) => text(row.pilot_user_id))
        .filter((id): id is string => id !== null),
    ),
  ];

  const [orgResult, pilotResult, offerResult] = await Promise.all([
    orgIds.length > 0
      ? supabase.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as Row[] }),
    pilotIds.length > 0
      ? supabase
          .from("pilot_profiles")
          .select("user_id, display_name")
          .in("user_id", pilotIds)
      : Promise.resolve({ data: [] as Row[] }),
    supabase
      .from("visit_volunteers")
      .select("visit_id")
      .in("visit_id", ids)
      .is("withdrawn_at", null),
  ]);

  const orgName = new Map<string, string>();
  for (const row of (orgResult.data ?? []) as Row[]) {
    const id = text(row.id);
    const name = text(row.name);
    if (id && name) orgName.set(id, name);
  }

  const pilotName = new Map<string, string>();
  for (const row of (pilotResult.data ?? []) as Row[]) {
    const id = text(row.user_id);
    const name = text(row.display_name);
    if (id && name) pilotName.set(id, name);
  }

  const offers = new Map<string, number>();
  for (const row of (offerResult.data ?? []) as Row[]) {
    const id = text(row.visit_id);
    if (id) offers.set(id, (offers.get(id) ?? 0) + 1);
  }

  const visits: ClassroomVisit[] = [];

  for (const row of rows) {
    const id = text(row.id);
    const organizationId = text(row.organization_id);
    const gradeLevel = text(row.grade_level);
    const format = text(row.format);
    const windowStart = text(row.window_start);
    const windowEnd = text(row.window_end);
    const status = text(row.status);
    const expected = int(row.expected_students);

    if (
      !id ||
      !organizationId ||
      !gradeLevel ||
      !windowStart ||
      !windowEnd ||
      !status ||
      expected === null ||
      (format !== "in_person" && format !== "virtual")
    ) {
      continue;
    }

    const pilotUserId = text(row.pilot_user_id);

    visits.push({
      id,
      organizationId,
      organizationName: orgName.get(organizationId) ?? null,
      gradeLevel,
      subject: text(row.subject),
      expectedStudents: expected,
      format,
      city: text(row.city),
      state: text(row.state),
      windowStart,
      windowEnd,
      confirmedFor: text(row.confirmed_for),
      notes: text(row.notes),
      status: status as ClassroomVisit["status"],
      pilotUserId,
      pilotName: pilotUserId ? (pilotName.get(pilotUserId) ?? null) : null,
      studentsAttended: int(row.students_attended),
      durationMinutes: int(row.duration_minutes),
      cancelledReason: text(row.cancelled_reason),
      code: text(row.code),
      volunteerCount: offers.get(id) ?? 0,
    });
  }

  return visits;
}

/** Every visit the caller is allowed to see, newest first. RLS decides. */
export async function loadVisits(
  supabase: SupabaseClient,
  options: { status?: string } = {},
): Promise<ClassroomVisit[]> {
  let query = supabase.from("classroom_visits").select(COLUMNS);

  if (options.status) query = query.eq("status", options.status);

  const { data, error } = await query
    .order("window_start", { ascending: true })
    .limit(200);

  if (error) {
    throw new Error(`visits: ${error.message}`);
  }

  return decorate(supabase, (data ?? []) as Row[]);
}

export async function loadVisit(
  supabase: SupabaseClient,
  id: string,
): Promise<ClassroomVisit | null> {
  const { data, error } = await supabase
    .from("classroom_visits")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`visit: ${error.message}`);
  }

  if (!data) return null;

  const [visit] = await decorate(supabase, [data as Row]);

  return visit ?? null;
}

/**
 * Who has offered, with enough of each pilot to choose between them.
 *
 * A teacher picking a pilot should see what a student would see — what they fly
 * and where they grew up — not a list of user ids.
 */
export async function loadOffers(
  supabase: SupabaseClient,
  visitId: string,
): Promise<VisitOffer[]> {
  const { data, error } = await supabase
    .from("visit_volunteers")
    .select("id, pilot_user_id, message, offered_at")
    .eq("visit_id", visitId)
    .is("withdrawn_at", null)
    .order("offered_at");

  if (error) {
    throw new Error(`offers: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];

  if (rows.length === 0) return [];

  const pilotIds = rows
    .map((row) => text(row.pilot_user_id))
    .filter((id): id is string => id !== null);

  const { data: pilots } = await supabase
    .from("pilot_profiles")
    .select("user_id, display_name, job_title, grew_up_in")
    .in("user_id", pilotIds);

  const byId = new Map<string, Row>();
  for (const row of (pilots ?? []) as Row[]) {
    const id = text(row.user_id);
    if (id) byId.set(id, row);
  }

  const offers: VisitOffer[] = [];

  for (const row of rows) {
    const pilotUserId = text(row.pilot_user_id);
    const id = int(row.id);
    if (!pilotUserId || id === null) continue;

    const pilot = byId.get(pilotUserId);

    offers.push({
      id,
      pilotUserId,
      pilotName: text(pilot?.display_name),
      pilotJobTitle: text(pilot?.job_title),
      pilotGrewUpIn: text(pilot?.grew_up_in),
      message: text(row.message),
      offeredAt: text(row.offered_at) ?? "",
    });
  }

  return offers;
}

/** Has the caller already offered for this visit? */
export async function hasOffered(
  supabase: SupabaseClient,
  visitId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("visit_volunteers")
    .select("id")
    .eq("visit_id", visitId)
    .eq("pilot_user_id", userId)
    .is("withdrawn_at", null)
    .maybeSingle();

  return data !== null;
}

// --- Writes. Each function checks the caller itself. ------------------------

async function call(
  supabase: SupabaseClient,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const { data, error } = await supabase.rpc(name, args);

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

export async function requestVisit(
  supabase: SupabaseClient,
  input: {
    organizationId: string;
    gradeLevel: string;
    expectedStudents: number;
    format: string;
    windowStart: string;
    windowEnd: string;
    subject: string | null;
    city: string | null;
    state: string | null;
    notes: string | null;
  },
): Promise<string> {
  const { error } = await supabase.rpc("request_classroom_visit", {
    p_organization_id: input.organizationId,
    p_grade_level: input.gradeLevel,
    p_expected_students: input.expectedStudents,
    p_format: input.format,
    p_window_start: input.windowStart,
    p_window_end: input.windowEnd,
    p_subject: input.subject,
    p_city: input.city,
    p_state: input.state,
    p_notes: input.notes,
  });

  if (error) {
    throw new Error(error.message);
  }

  return "Asked. Pilots in your area can see it now.";
}

export const volunteerForVisit = (
  supabase: SupabaseClient,
  visitId: string,
  message: string | null,
) =>
  call(supabase, "volunteer_for_visit", {
    p_visit_id: visitId,
    p_message: message,
  });

export const withdrawFromVisit = (supabase: SupabaseClient, visitId: string) =>
  call(supabase, "withdraw_from_visit", { p_visit_id: visitId });

export const confirmVisit = (
  supabase: SupabaseClient,
  visitId: string,
  pilot: string,
  when: string,
) =>
  call(supabase, "confirm_classroom_visit", {
    p_visit_id: visitId,
    p_pilot: pilot,
    p_when: when,
  });

export const completeVisit = (
  supabase: SupabaseClient,
  visitId: string,
  studentsAttended: number,
  durationMinutes: number | null,
) =>
  call(supabase, "complete_classroom_visit", {
    p_visit_id: visitId,
    p_students_attended: studentsAttended,
    p_duration_minutes: durationMinutes,
  });

export const cancelVisit = (
  supabase: SupabaseClient,
  visitId: string,
  reason: string | null,
) =>
  call(supabase, "cancel_classroom_visit", {
    p_visit_id: visitId,
    p_reason: reason,
  });

// --- What somebody has actually done ----------------------------------------

/**
 * A record, never a ranking.
 *
 * The business rules are explicit that there is no mentor leaderboard, because
 * it turns a supportive community competitive and punishes whoever took the
 * hardest assignment — the pilot who drives three hours to a rural school loses
 * to one doing eight easy visits near home. So a pilot sees their own numbers and
 * nobody else's, and nothing here can be ordered against another person.
 *
 * Every figure comes from a completed visit, and the headcount on a completed
 * visit was entered by the school rather than the pilot. That is what makes this
 * worth putting on a professional record.
 */
export type ImpactRecord = {
  visits: number;
  studentsReached: number;
  minutes: number;
  /** Distinct schools, or distinct pilots, depending on whose record this is. */
  partners: number;
  firstVisit: string | null;
  latestVisit: string | null;
};

function summarise(
  rows: Row[],
  partnerColumn: "organization_id" | "pilot_user_id",
): ImpactRecord {
  const partners = new Set<string>();
  let studentsReached = 0;
  let minutes = 0;
  let first: string | null = null;
  let latest: string | null = null;

  for (const row of rows) {
    const partner = text(row[partnerColumn]);
    if (partner) partners.add(partner);

    studentsReached += int(row.students_attended) ?? 0;
    minutes += int(row.duration_minutes) ?? 0;

    const when = text(row.completed_at);
    if (when) {
      if (first === null || when < first) first = when;
      if (latest === null || when > latest) latest = when;
    }
  }

  return {
    visits: rows.length,
    studentsReached,
    minutes,
    partners: partners.size,
    firstVisit: first,
    latestVisit: latest,
  };
}

/** One pilot's own record. Reads their own completed visits; RLS scopes it. */
export async function loadPilotImpact(
  supabase: SupabaseClient,
  userId: string,
): Promise<ImpactRecord> {
  const { data, error } = await supabase
    .from("classroom_visits")
    .select(
      "organization_id, students_attended, duration_minutes, completed_at",
    )
    .eq("pilot_user_id", userId)
    .eq("status", "completed");

  if (error) {
    throw new Error(`pilot impact: ${error.message}`);
  }

  return summarise((data ?? []) as Row[], "organization_id");
}

/**
 * One school's record, across every visit it has hosted.
 *
 * Counts distinct pilots rather than schools, since the school is the constant.
 */
export async function loadSchoolImpact(
  supabase: SupabaseClient,
  organizationIds: string[],
): Promise<ImpactRecord> {
  if (organizationIds.length === 0) {
    return {
      visits: 0,
      studentsReached: 0,
      minutes: 0,
      partners: 0,
      firstVisit: null,
      latestVisit: null,
    };
  }

  const { data, error } = await supabase
    .from("classroom_visits")
    .select("pilot_user_id, students_attended, duration_minutes, completed_at")
    .in("organization_id", organizationIds)
    .eq("status", "completed");

  if (error) {
    throw new Error(`school impact: ${error.message}`);
  }

  return summarise((data ?? []) as Row[], "pilot_user_id");
}

// --- Attribution: which visit reached which student -------------------------

/**
 * What a student sees when they type the code from the board.
 *
 * Read with the SERVICE ROLE, because the page is public — somebody who just
 * met a pilot has no account yet, and `pilot_profiles` is readable only to
 * signed-in users. Only the pilot's public story is returned: no email, no
 * vetting detail, no school contact, nothing about any other student.
 */
export type VisitInvitation = {
  code: string;
  organizationName: string | null;
  pilotName: string | null;
  pilotJobTitle: string | null;
  pilotEmployer: string | null;
  pilotStory: string | null;
  pilotGrewUpIn: string | null;
  pilotWishIHadKnown: string | null;
  pilotAffiliations: string[];
};

export async function loadVisitByCode(
  admin: SupabaseClient,
  code: string,
): Promise<VisitInvitation | null> {
  const tidy = code.trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(tidy)) return null;

  const { data, error } = await admin
    .from("classroom_visits")
    .select("code, status, organization_id, pilot_user_id")
    .eq("code", tidy)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Row;
  const status = text(row.status);

  // A code for a visit that was cancelled, or never confirmed, invites nobody.
  if (status !== "confirmed" && status !== "completed") return null;

  const organizationId = text(row.organization_id);
  const pilotUserId = text(row.pilot_user_id);

  const [orgResult, pilotResult] = await Promise.all([
    organizationId
      ? admin
          .from("organizations")
          .select("name")
          .eq("id", organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    pilotUserId
      ? admin
          .from("pilot_profiles")
          .select(
            "display_name, job_title, employer, story, grew_up_in, wish_i_had_known, affiliations",
          )
          .eq("user_id", pilotUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const pilot = (pilotResult.data ?? null) as Row | null;

  return {
    code: tidy,
    organizationName: text((orgResult.data as Row | null)?.name),
    pilotName: text(pilot?.display_name),
    pilotJobTitle: text(pilot?.job_title),
    pilotEmployer: text(pilot?.employer),
    pilotStory: text(pilot?.story),
    pilotGrewUpIn: text(pilot?.grew_up_in),
    pilotWishIHadKnown: text(pilot?.wish_i_had_known),
    pilotAffiliations: Array.isArray(pilot?.affiliations)
      ? (pilot.affiliations as unknown[]).filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
  };
}

/** A student says which visit reached them. Their own client — it records them. */
export const claimVisitCode = (supabase: SupabaseClient, code: string) =>
  call(supabase, "claim_visit_code", { p_code: code });

/** How many students each visit has brought in. */
export async function loadSignupCounts(
  supabase: SupabaseClient,
  visitIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (visitIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("visit_signups")
    .select("visit_id")
    .in("visit_id", visitIds);

  if (error) {
    // Context, not correctness. A failed read shows no number rather than
    // hiding the visit it belongs to.
    console.error("Could not read signup counts:", { error: error.message });
    return counts;
  }

  for (const row of (data ?? []) as Row[]) {
    const id = text(row.visit_id);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return counts;
}
