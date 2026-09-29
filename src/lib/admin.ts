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
  /** 'admin' or 'student' — reviewing is no longer a role (see 0033). */
  role: string;
  /** Holds a live grant in content_reviewers. */
  mayReview: boolean;
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
 * Everyone who holds a capability: administrators, and content reviewers.
 *
 * Since 0033 reviewing is a live grant in `content_reviewers` rather than a role,
 * so this reads both and merges them — a person can be neither, either, or both.
 *
 * Deliberately not a list of all accounts. A screen that lists every student by
 * email invites idle browsing of minors' addresses, and nothing on this page
 * needs it — the one write takes an email that was typed in.
 */
export async function loadStaffAccounts(
  admin: SupabaseClient,
): Promise<StaffAccount[]> {
  const [profileResult, reviewerResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, display_name, role, reviewer_credential")
      .neq("role", "student")
      .order("email"),
    admin.from("content_reviewers").select("user_id").is("revoked_at", null),
  ]);

  if (profileResult.error) {
    throw new Error(`staff accounts: ${profileResult.error.message}`);
  }

  if (reviewerResult.error) {
    throw new Error(`content reviewers: ${reviewerResult.error.message}`);
  }

  const reviewerIds = new Set<string>();
  for (const row of (reviewerResult.data ?? []) as Row[]) {
    const id = text(row.user_id);
    if (id) reviewerIds.add(id);
  }

  const accounts = new Map<string, StaffAccount>();

  for (const row of (profileResult.data ?? []) as Row[]) {
    const userId = text(row.id);
    const role = text(row.role);
    if (!userId || !role) continue;

    accounts.set(userId, {
      userId,
      email: text(row.email),
      displayName: text(row.display_name),
      role,
      mayReview: reviewerIds.has(userId),
      reviewerCredential: text(row.reviewer_credential),
    });
  }

  // Reviewers who are otherwise plain students — the normal case for a CFI.
  const missing = [...reviewerIds].filter((id) => !accounts.has(id));

  if (missing.length > 0) {
    const { data } = await admin
      .from("profiles")
      .select("id, email, display_name, role, reviewer_credential")
      .in("id", missing);

    for (const row of (data ?? []) as Row[]) {
      const userId = text(row.id);
      if (!userId) continue;

      accounts.set(userId, {
        userId,
        email: text(row.email),
        displayName: text(row.display_name),
        role: text(row.role) ?? "student",
        mayReview: true,
        reviewerCredential: text(row.reviewer_credential),
      });
    }
  }

  return [...accounts.values()].sort((a, b) =>
    (a.email ?? "").localeCompare(b.email ?? ""),
  );
}

/**
 * Grants or revokes the content-reviewing capability by email.
 *
 * Since 0033 this no longer touches `profiles.role`, so granting it does not
 * make someone a "mentor" — that word is free for a pilot who visits classrooms.
 *
 * The function raises with wording written for the founder: an account that has
 * not finished signing up, or an administrator who must be changed in SQL. Those
 * messages are passed through rather than replaced, because each one says what
 * to do next.
 */
export async function setContentReviewer(
  supabase: SupabaseClient,
  email: string,
  mayReview: boolean,
): Promise<string> {
  const { data, error } = await supabase.rpc("set_content_reviewer", {
    p_email: email,
    p_may_review: mayReview,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}
