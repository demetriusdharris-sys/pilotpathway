import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether a student is sharing their progress with a school, per organisation.
 *
 * Consent is per organisation, not a single on/off switch: a student may be a
 * member of a school and a sponsor's cohort at once, and agreeing to share
 * with one says nothing about the other. Since 0021 the database enforces
 * that — staff may read a student's progress only where the consent names
 * their own organisation.
 *
 * Read with the caller's own client. The policies from 0006 scope memberships
 * and consent rows to the signed-in person.
 *
 * Only memberships held as a student are offered. Staff of an organisation
 * have nothing to decide here — they would be sharing their progress with
 * themselves — and showing them the control suggests otherwise.
 */

export const SCHOOL_PROGRESS_SCOPE = "school_progress";

export type SchoolSharing = {
  organizationId: string;
  name: string;
  orgType: string;
  /** Sharing is live right now. */
  sharing: boolean;
  /** Set when sharing, as the stored timestamp. */
  grantedAt: string | null;
  /** 'self' or 'guardian' — who agreed on the student's behalf. */
  grantedBy: string | null;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export async function loadSchoolSharing(
  supabase: SupabaseClient,
  userId: string,
): Promise<SchoolSharing[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, org_role, organizations(id, name, org_type)")
    .eq("user_id", userId)
    .eq("org_role", "member");

  if (membershipError) {
    throw new Error(`organization memberships: ${membershipError.message}`);
  }

  const rows = (memberships ?? []) as Row[];

  if (rows.length === 0) {
    return [];
  }

  // Only the student's own live grants. Revoked and expired rows are history
  // and must not read as sharing.
  const { data: consents, error: consentError } = await supabase
    .from("consent")
    .select("audience_org_id, granted_at, granted_by_relationship, expires_at")
    .eq("subject_user_id", userId)
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .is("revoked_at", null);

  if (consentError) {
    throw new Error(`consent: ${consentError.message}`);
  }

  const now = Date.now();
  const active = new Map<string, Row>();

  for (const row of (consents ?? []) as Row[]) {
    const orgId = text(row.audience_org_id);
    if (!orgId) continue;

    const expires = text(row.expires_at);
    if (expires !== null && Date.parse(expires) <= now) {
      continue;
    }

    active.set(orgId, row);
  }

  const sharing: SchoolSharing[] = [];

  for (const row of rows) {
    const organization = (
      Array.isArray(row.organizations)
        ? row.organizations[0]
        : row.organizations
    ) as Row | undefined;

    const organizationId = text(row.organization_id);
    const name = text(organization?.name);
    const orgType = text(organization?.org_type);

    if (!organizationId || !name || !orgType) continue;

    const grant = active.get(organizationId);

    sharing.push({
      organizationId,
      name,
      orgType,
      sharing: grant !== undefined,
      grantedAt: grant ? text(grant.granted_at) : null,
      grantedBy: grant ? text(grant.granted_by_relationship) : null,
    });
  }

  return sharing;
}

/**
 * The same picture for a student a guardian is responsible for.
 *
 * Read with the service role, because a guardian cannot see a student's
 * memberships or consent rows under RLS — and should not be able to outside of
 * exactly this check. **Every caller must have run authorizeGuardianAction
 * first**; this function establishes nothing about who is asking.
 */
export async function loadSchoolSharingForStudent(
  admin: SupabaseClient,
  studentId: string,
): Promise<SchoolSharing[]> {
  return loadSchoolSharing(admin, studentId);
}

/**
 * Is this student actually enrolled at this organisation?
 *
 * The consent policy from 0007 checks that the grantor is a verified guardian,
 * and 0021's constraint checks that a school_progress grant names an
 * organisation — but nothing in the database checks that the organisation
 * named is one the student belongs to. Without this, a guardian could consent
 * on a minor's behalf to an arbitrary organisation id.
 */
export async function studentBelongsTo(
  admin: SupabaseClient,
  studentId: string,
  organizationId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("organization_members")
    .select("id")
    .eq("user_id", studentId)
    .eq("organization_id", organizationId)
    .eq("org_role", "member")
    .limit(1);

  if (error) {
    throw new Error(`student membership: ${error.message}`);
  }

  return (data ?? []).length > 0;
}
