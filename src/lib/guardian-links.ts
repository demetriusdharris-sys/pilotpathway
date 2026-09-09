import type { SupabaseClient } from "@supabase/supabase-js";

export type GuardianLinkStatus = "pending" | "verified";

export type GuardianLink = {
  id: string;
  invitedEmail: string | null;
  status: GuardianLinkStatus;
  verificationMethod: string;
  tokenExpiresAt: string | null;
  verifiedAt: string | null;
};

const STATUSES: readonly string[] = ["pending", "verified"];

/**
 * A student's own guardian links, revoked ones excluded.
 *
 * Uses the caller's client, not the admin client. The "Student and guardian
 * read their own links" policy from 0007 already scopes this to rows where the
 * signed-in user is the student or the guardian, so RLS is doing the work.
 * Reaching for the service role here would bypass that for nothing.
 *
 * Note the asymmetry with writes: every write to guardian_links goes through
 * the service role in a server route, because verification is the security
 * property. Reading your own row is not.
 */
export async function loadGuardianLinks(
  supabase: SupabaseClient,
  userId: string,
): Promise<GuardianLink[]> {
  const { data, error } = await supabase
    .from("guardian_links")
    .select(
      "id, invited_email, status, verification_method, token_expires_at, verified_at",
    )
    .eq("student_user_id", userId)
    .neq("status", "revoked")
    .order("invited_at", { ascending: false });

  if (error || !data) {
    if (error) {
      console.error("Failed to load guardian links:", {
        userId,
        error: error.message,
      });
    }
    return [];
  }

  const links: GuardianLink[] = [];

  for (const row of data) {
    const id = row.id;
    const status = row.status;
    const verificationMethod = row.verification_method;

    // A row whose status or ids are not what we expect is dropped rather than
    // rendered. A malformed guardian row is not something to guess about.
    if (
      typeof id !== "string" ||
      typeof status !== "string" ||
      !STATUSES.includes(status) ||
      typeof verificationMethod !== "string"
    ) {
      continue;
    }

    links.push({
      id,
      invitedEmail:
        typeof row.invited_email === "string" ? row.invited_email : null,
      status: status as GuardianLinkStatus,
      verificationMethod,
      tokenExpiresAt:
        typeof row.token_expires_at === "string" ? row.token_expires_at : null,
      verifiedAt:
        typeof row.verified_at === "string" ? row.verified_at : null,
    });
  }

  return links;
}
