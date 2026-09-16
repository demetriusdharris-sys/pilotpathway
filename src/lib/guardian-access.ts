import type { SupabaseClient } from "@supabase/supabase-js";
import { ADULT_AGE_YEARS, hasReachedAge } from "@/lib/date-of-birth";

/**
 * What a guardian may do for a linked student, decided in one place.
 *
 * Every guardian action — showing the student, downloading their data,
 * deleting their account — calls into this module on the server. Nothing the
 * browser sends is trusted to establish the relationship; the request names a
 * student, and this module checks that a verified link to that student exists.
 *
 * The rules (founder decisions, Sep 16 2026):
 *
 *   - Only a VERIFIED guardian link counts. Pending and revoked do not.
 *   - Guardian actions apply only to a student whose date of birth is on file
 *     and under 18. Elsewhere this app treats unknown age as a minor, because
 *     that restricts the student. Here the same assumption would hand an
 *     outsider power over someone who may be an adult, so unknown age means no
 *     guardian actions.
 *   - Deleting the account: any verified guardian.
 *   - Downloading the data: only a guardian verified by the student's school or
 *     by staff. An email invite proves control of a mailbox, not guardianship,
 *     and a download is a minor's private tutor conversations. Same tiering as
 *     live sessions.
 */

const STRONG_VERIFICATION_METHODS: readonly string[] = [
  "school_roster",
  "staff_manual",
];

export type GuardedStudent = {
  studentId: string;
  firstName: string | null;
  email: string | null;
  verificationMethod: string;
  dateOfBirthKnown: boolean;
  isMinor: boolean;
  canDelete: boolean;
  canExport: boolean;
};

type LinkRow = { student_user_id: unknown; verification_method: unknown };
type ProfileRow = {
  id: unknown;
  first_name: unknown;
  email: unknown;
  date_of_birth: unknown;
};

function describe(link: LinkRow, profile: ProfileRow | undefined): GuardedStudent | null {
  const studentId = link.student_user_id;
  const verificationMethod = link.verification_method;

  if (typeof studentId !== "string" || typeof verificationMethod !== "string") {
    return null;
  }

  const dateOfBirth =
    typeof profile?.date_of_birth === "string" ? profile.date_of_birth : null;

  const dateOfBirthKnown = dateOfBirth !== null;
  const isMinor = dateOfBirthKnown && !hasReachedAge(dateOfBirth, ADULT_AGE_YEARS);

  return {
    studentId,
    firstName:
      typeof profile?.first_name === "string" ? profile.first_name : null,
    email: typeof profile?.email === "string" ? profile.email : null,
    verificationMethod,
    dateOfBirthKnown,
    isMinor,
    canDelete: isMinor,
    canExport:
      isMinor && STRONG_VERIFICATION_METHODS.includes(verificationMethod),
  };
}

async function describeLinks(
  admin: SupabaseClient,
  links: LinkRow[],
): Promise<GuardedStudent[]> {
  const ids = links
    .map((link) => link.student_user_id)
    .filter((id): id is string => typeof id === "string");

  if (ids.length === 0) {
    return [];
  }

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, first_name, email, date_of_birth")
    .in("id", ids);

  if (error) {
    throw new Error(`guardian student profiles: ${error.message}`);
  }

  const byId = new Map<string, ProfileRow>();
  for (const row of (profiles ?? []) as ProfileRow[]) {
    if (typeof row.id === "string") {
      byId.set(row.id, row);
    }
  }

  return links
    .map((link) =>
      typeof link.student_user_id === "string"
        ? describe(link, byId.get(link.student_user_id))
        : null,
    )
    .filter((student): student is GuardedStudent => student !== null);
}

/**
 * Every student this account is a verified guardian of. Uses the service role:
 * a guardian cannot read a student's profile under RLS, and should not be able
 * to outside of exactly this check.
 */
export async function loadGuardedStudents(
  admin: SupabaseClient,
  guardianId: string,
): Promise<GuardedStudent[]> {
  const { data, error } = await admin
    .from("guardian_links")
    .select("student_user_id, verification_method")
    .eq("guardian_user_id", guardianId)
    .eq("status", "verified")
    .order("verified_at", { ascending: true });

  if (error) {
    throw new Error(`guardian links: ${error.message}`);
  }

  return describeLinks(admin, (data ?? []) as LinkRow[]);
}

/**
 * The single check every guardian action runs before doing anything. Returns
 * null unless `guardianId` holds a verified link to `studentId` right now.
 * Callers must then still check canDelete or canExport for the action they
 * are about to take.
 */
export async function authorizeGuardianAction(
  admin: SupabaseClient,
  guardianId: string,
  studentId: string,
): Promise<GuardedStudent | null> {
  const { data, error } = await admin
    .from("guardian_links")
    .select("student_user_id, verification_method")
    .eq("guardian_user_id", guardianId)
    .eq("student_user_id", studentId)
    .eq("status", "verified")
    .maybeSingle();

  if (error) {
    throw new Error(`guardian authorization: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const [student] = await describeLinks(admin, [data as LinkRow]);
  return student ?? null;
}
