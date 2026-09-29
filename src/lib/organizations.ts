import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Schools, sponsors and who is at them.
 *
 * Creating one is an administrator's act, because staff of a school can
 * eventually read the progress of students who consent to share with them — so
 * "is this a real school" is a judgement a person has to make, and a school
 * cannot register itself.
 *
 * Adding staff is not: whoever runs a school adds their own teachers. Otherwise
 * the bottleneck moves from a SQL editor to a form the founder still fills in.
 *
 * Every write goes through a function that checks the caller. Reads go through
 * the caller's own client, so `0038`'s policy is what decides whether they may
 * see a membership list.
 */

export const ORG_TYPE_LABEL: Record<string, string> = {
  school: "School",
  district: "District",
  sponsor: "Sponsor",
  flight_school: "Flight school",
};

export const ORG_ROLE_LABEL: Record<string, string> = {
  member: "Enrolled student",
  staff: "Staff",
  org_admin: "Runs this school",
};

export type OrganizationSummary = {
  id: string;
  name: string;
  orgType: string;
  /** Null until somebody has confirmed it is a real school. */
  verifiedAt: string | null;
  verifiedBy: string | null;
  selfRegistered: boolean;
  members: { userId: string; email: string | null; orgRole: string }[];
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Every organisation, with who is at it. For the admin screen, so it reads with
 * the service role — after `may_administer()` has answered true.
 *
 * Enrolled students are counted but not listed by email. A screen naming every
 * student at every school invites idle browsing of minors' addresses, and
 * nothing here needs it; the roster at `/school` exists for the students who
 * chose to share, which is a different and consented thing.
 */
export async function loadOrganizations(
  admin: SupabaseClient,
): Promise<OrganizationSummary[]> {
  const [orgResult, memberResult] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, org_type, verified_at, verified_by, self_registered")
      .order("verified_at", { nullsFirst: true })
      .order("name"),
    admin
      .from("organization_members")
      .select("organization_id, user_id, org_role"),
  ]);

  if (orgResult.error) {
    throw new Error(`organizations: ${orgResult.error.message}`);
  }

  if (memberResult.error) {
    throw new Error(`organization members: ${memberResult.error.message}`);
  }

  const memberRows = (memberResult.data ?? []) as Row[];

  // Emails only for the people whose email this screen shows — staff and whoever
  // runs the school. Students are counted, never named.
  const namedIds = [
    ...new Set(
      memberRows
        .filter((row) => {
          const role = text(row.org_role);
          return role === "staff" || role === "org_admin";
        })
        .map((row) => text(row.user_id))
        .filter((id): id is string => id !== null),
    ),
  ];

  const emailById = new Map<string, string>();

  if (namedIds.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", namedIds);

    for (const row of (data ?? []) as Row[]) {
      const id = text(row.id);
      const email = text(row.email);
      if (id && email) emailById.set(id, email);
    }
  }

  const byOrg = new Map<string, OrganizationSummary["members"]>();

  for (const row of memberRows) {
    const orgId = text(row.organization_id);
    const userId = text(row.user_id);
    const orgRole = text(row.org_role);

    if (!orgId || !userId || !orgRole) continue;

    const list = byOrg.get(orgId) ?? [];
    list.push({
      userId,
      email: emailById.get(userId) ?? null,
      orgRole,
    });
    byOrg.set(orgId, list);
  }

  const organizations: OrganizationSummary[] = [];

  for (const row of (orgResult.data ?? []) as Row[]) {
    const id = text(row.id);
    const name = text(row.name);
    const orgType = text(row.org_type);

    if (!id || !name || !orgType) continue;

    const members = (byOrg.get(id) ?? []).sort((a, b) =>
      a.orgRole === b.orgRole
        ? (a.email ?? "").localeCompare(b.email ?? "")
        : a.orgRole.localeCompare(b.orgRole),
    );

    organizations.push({
      id,
      name,
      orgType,
      verifiedAt: text(row.verified_at),
      verifiedBy: text(row.verified_by),
      selfRegistered: row.self_registered === true,
      members,
    });
  }

  return organizations;
}

export async function createOrganization(
  supabase: SupabaseClient,
  name: string,
  orgType: string,
  adminEmail: string | null,
): Promise<string> {
  const { error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_org_type: orgType,
    p_admin_email: adminEmail,
  });

  if (error) {
    throw new Error(error.message);
  }

  return adminEmail
    ? `${name} is set up, and ${adminEmail} runs it.`
    : `${name} is set up. Add whoever runs it next.`;
}

export async function setOrganizationMember(
  supabase: SupabaseClient,
  organizationId: string,
  email: string,
  orgRole: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("set_organization_member", {
    p_organization_id: organizationId,
    p_email: email,
    p_org_role: orgRole,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

export async function removeOrganizationMember(
  supabase: SupabaseClient,
  organizationId: string,
  email: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("remove_organization_member", {
    p_organization_id: organizationId,
    p_email: email,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

/** Confirms a school is real. Administrators only. */
export async function verifyOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  verifiedBy: string,
  note: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("verify_organization", {
    p_organization_id: organizationId,
    p_verified_by: verifiedBy,
    p_note: note,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

/**
 * Withdraws a school.
 *
 * Deliberately removes nobody and cancels nothing: it stops the school enrolling
 * students and stops new visits being confirmed. Unpicking what already happened
 * is a decision a person should make case by case.
 */
export async function unverifyOrganization(
  supabase: SupabaseClient,
  organizationId: string,
  note: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("unverify_organization", {
    p_organization_id: organizationId,
    p_note: note,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

/** Whether the caller runs any organisation — they can then set one up or use it. */
export async function loadOwnOrganizations(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; name: string; verifiedAt: string | null }[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, org_role, organizations(name, verified_at)")
    .eq("user_id", userId)
    .in("org_role", ["staff", "org_admin"]);

  if (error) {
    console.error("Could not read your organisations:", {
      error: error.message,
    });
    return [];
  }

  const list: { id: string; name: string; verifiedAt: string | null }[] = [];

  for (const row of (data ?? []) as Row[]) {
    const id = text(row.organization_id);
    const nested = row.organizations as Row | null;
    const name = text(nested?.name);
    if (id && name) {
      list.push({ id, name, verifiedAt: text(nested?.verified_at) });
    }
  }

  return list;
}
