import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The admin screen's reads and its one write.
 *
 * `isAdmin` and `setReviewerRole` both go through the caller's own client on
 * purpose: `may_administer()` and `set_reviewer_role()` read `auth.uid()`, and
 * the service role would sail straight past the only check standing between a
 * student and the ability to hand out reviewer access.
 *
 * The listing read uses the service role, because a student cannot select other
 * people's profile rows and should not be able to. Nothing here is reachable
 * without `may_administer()` having already answered true.
 */

export type StaffAccount = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: string;
  reviewerCredential: string | null;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/** Admins only — narrower than a reviewer. Asked of the database. */
export async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("may_administer");

  if (error) {
    console.error("Could not check admin role:", { error: error.message });
    return false;
  }

  return data === true;
}

/**
 * Everyone who is not a plain student.
 *
 * Deliberately not a list of all accounts. A screen that lists every student by
 * email invites idle browsing of minors' addresses, and nothing on this page
 * needs it — the one write takes an email that was typed in.
 */
export async function loadStaffAccounts(
  admin: SupabaseClient,
): Promise<StaffAccount[]> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, display_name, role, reviewer_credential")
    .neq("role", "student")
    .order("role")
    .order("email");

  if (error) {
    throw new Error(`staff accounts: ${error.message}`);
  }

  const accounts: StaffAccount[] = [];

  for (const row of (data ?? []) as Row[]) {
    const userId = text(row.id);
    const role = text(row.role);

    if (!userId || !role) continue;

    accounts.push({
      userId,
      email: text(row.email),
      displayName: text(row.display_name),
      role,
      reviewerCredential: text(row.reviewer_credential),
    });
  }

  return accounts;
}

/**
 * Grants or removes reviewer access by email.
 *
 * The function raises with wording written for the founder — an account that
 * has not finished signing up, an admin that must be changed in SQL, a role
 * this page will not set. Those messages are passed through rather than
 * replaced, because each one tells him what to do next.
 */
export async function setReviewerRole(
  supabase: SupabaseClient,
  email: string,
  role: "student" | "mentor",
): Promise<string> {
  const { data, error } = await supabase.rpc("set_reviewer_role", {
    p_email: email,
    p_role: role,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}
