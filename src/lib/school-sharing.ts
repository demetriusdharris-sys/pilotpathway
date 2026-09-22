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
    .eq("user_id", userId);

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
