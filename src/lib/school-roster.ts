import type { SupabaseClient } from "@supabase/supabase-js";
import { SCHOOL_PROGRESS_SCOPE } from "@/lib/school-sharing";

/**
 * What a member of school staff may see about their students.
 *
 * Three rules hold this together, and the order matters:
 *
 *   1. **The database decides who is visible, not this file.** Mastery is read
 *      with the staff member's own client, so the policies from 0009 and 0021
 *      filter it: shared organisation, active school_progress consent, and the
 *      consent naming this organisation. If this code were wrong, RLS would
 *      still return nothing.
 *   2. **The service role is used only to put names to ids that consent has
 *      already cleared.** A student who has not consented is never looked up.
 *   3. **A consented student with no quiz answers still appears**, with nothing
 *      against their name. Otherwise a teacher would read an empty roster as
 *      "nobody is sharing" when the truth is "nobody has been asked anything
 *      yet" — the same distinction the lesson pages make.
 *
 * Tutor conversations are not here and must never be added. The student agreed
 * to share progress, not the questions they were embarrassed to ask.
 */

export type StaffOrganization = {
  organizationId: string;
  name: string;
  orgType: string;
  orgRole: string;
};

export type RosterStudent = {
  studentId: string;
  firstName: string | null;
  email: string | null;
  /** Objectives shown, of those with an approved quiz card. */
  shown: number;
  /** Objectives the student has answered at least one card on. */
  attempted: number;
  lastAssessedAt: string | null;
};

export type Roster = {
  organization: StaffOrganization;
  /** Everyone enrolled, whether or not they share. */
  memberCount: number;
  /** Those currently sharing with this organisation. */
  students: RosterStudent[];
  /** Objectives that currently have an approved card, across the curriculum. */
  assessableObjectives: number;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** The organisations this account is staff of. Empty for a student. */
export async function loadStaffOrganizations(
  supabase: SupabaseClient,
  userId: string,
): Promise<StaffOrganization[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, org_role, organizations(name, org_type)")
    .eq("user_id", userId)
    .in("org_role", ["staff", "org_admin"]);

  if (error) {
    throw new Error(`staff organizations: ${error.message}`);
  }

  const organizations: StaffOrganization[] = [];

  for (const row of (data ?? []) as Row[]) {
    const organization = (
      Array.isArray(row.organizations)
        ? row.organizations[0]
        : row.organizations
    ) as Row | undefined;

    const organizationId = text(row.organization_id);
    const name = text(organization?.name);
    const orgType = text(organization?.org_type);
    const orgRole = text(row.org_role);

    if (!organizationId || !name || !orgType || !orgRole) continue;

    organizations.push({ organizationId, name, orgType, orgRole });
  }

  return organizations;
}

export async function loadRoster(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  organization: StaffOrganization,
): Promise<Roster> {
  // Enrolled students. Staff may read the memberships of their own
  // organisation under the policy from 0006.
  const { data: members, error: memberError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organization.organizationId)
    .eq("org_role", "member");

  if (memberError) {
    throw new Error(`roster members: ${memberError.message}`);
  }

  const memberIds = ((members ?? []) as Row[])
    .map((row) => text(row.user_id))
    .filter((id): id is string => id !== null);

  // Who is sharing with THIS organisation. Consent rows are readable only by
  // their subject, so this one read needs the service role — and it asks the
  // same question the database asks in staff_may_see_progress.
  const { data: consents, error: consentError } = await admin
    .from("consent")
    .select("subject_user_id, expires_at")
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .eq("audience_org_id", organization.organizationId)
    .is("revoked_at", null)
    .in("subject_user_id", memberIds.length > 0 ? memberIds : [""]);

  if (consentError) {
    throw new Error(`roster consent: ${consentError.message}`);
  }

  const now = Date.now();
  const consentedIds: string[] = [];

  for (const row of (consents ?? []) as Row[]) {
    const studentId = text(row.subject_user_id);
    if (!studentId || consentedIds.includes(studentId)) continue;

    const expires = text(row.expires_at);
    if (expires !== null && Date.parse(expires) <= now) continue;

    consentedIds.push(studentId);
  }

  const assessable = await countAssessableObjectives(supabase);

  if (consentedIds.length === 0) {
    return {
      organization,
      memberCount: memberIds.length,
      students: [],
      assessableObjectives: assessable,
    };
  }

  // Mastery through the staff member's own client on purpose: the policies
  // are the control, and this read is what proves them.
  const { data: mastery, error: masteryError } = await supabase
    .from("objective_mastery")
    .select("user_id, objective_id, is_mastered, last_assessed_at")
    .in("user_id", consentedIds);

  if (masteryError) {
    throw new Error(`roster mastery: ${masteryError.message}`);
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, first_name, email")
    .in("id", consentedIds);

  if (profileError) {
    throw new Error(`roster profiles: ${profileError.message}`);
  }

  const byId = new Map<string, Row>();
  for (const row of (profiles ?? []) as Row[]) {
    const id = text(row.id);
    if (id) byId.set(id, row);
  }

  const tally = new Map<
    string,
    { shown: number; attempted: number; last: string | null }
  >();
  for (const id of consentedIds) {
    tally.set(id, { shown: 0, attempted: 0, last: null });
  }

  for (const row of (mastery ?? []) as Row[]) {
    const studentId = text(row.user_id);
    if (!studentId) continue;

    const entry = tally.get(studentId);
    if (!entry) continue;

    entry.attempted += 1;
    if (row.is_mastered === true) entry.shown += 1;

    const last = text(row.last_assessed_at);
    if (last !== null && (entry.last === null || last > entry.last)) {
      entry.last = last;
    }
  }

  const students: RosterStudent[] = consentedIds.map((studentId) => {
    const entry = tally.get(studentId) ?? {
      shown: 0,
      attempted: 0,
      last: null,
    };
    const profile = byId.get(studentId);

    return {
      studentId,
      firstName: text(profile?.first_name),
      email: text(profile?.email),
      shown: entry.shown,
      attempted: entry.attempted,
      lastAssessedAt: entry.last,
    };
  });

  // Most progress first, then alphabetically, so the list is stable between
  // loads rather than reordering itself as answers come in.
  students.sort(
    (a, b) =>
      b.shown - a.shown ||
      (a.firstName ?? a.email ?? "").localeCompare(
        b.firstName ?? b.email ?? "",
      ),
  );

  return {
    organization,
    memberCount: memberIds.length,
    students,
    assessableObjectives: assessable,
  };
}

/**
 * How many objectives a student could currently show anything on. Zero until a
 * CFI approves cards, which is why the roster says so in words rather than
 * printing "0 of 0" at a teacher.
 */
async function countAssessableObjectives(
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from("quiz_cards")
    .select("objective_id");

  if (error) {
    throw new Error(`assessable objectives: ${error.message}`);
  }

  const objectives = new Set<string>();
  for (const row of (data ?? []) as Row[]) {
    const id = text(row.objective_id);
    if (id) objectives.add(id);
  }

  return objectives.size;
}
