"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Redemption is checked twice: once when the page renders, and again here.
 *
 * The render-time check exists so a guardian is not shown a button that
 * cannot work. This one is the actual gate. Between the two, a link can
 * expire, be redeemed in another tab, or be replaced by the student resending
 * the invite -- and only the check at write time can catch that.
 */
export async function confirmGuardianLink(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    redirect("/guardian/accept?status=failed");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Session expired between render and submit. Send them to log in with the
    // token preserved, rather than failing the link outright.
    redirect(
      `/login?next=${encodeURIComponent(`/guardian/accept?token=${token}`)}`,
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian confirmation blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    redirect("/guardian/accept?status=failed");
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: link, error } = await admin
    .from("guardian_links")
    .select("id, student_user_id, status, token_expires_at, token_redeemed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Guardian confirmation lookup failed:", error.message);
    redirect("/guardian/accept?status=failed");
  }

  const expiresAt =
    typeof link?.token_expires_at === "string"
      ? Date.parse(link.token_expires_at)
      : Number.NaN;

  const usable =
    link !== null &&
    link.status !== "revoked" &&
    link.token_redeemed_at === null &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now();

  if (!usable) {
    redirect("/guardian/accept?status=failed");
  }

  // A student redeeming their own invite would satisfy email_invite against
  // themselves. This is the hole tiered consent exists to close, so it is
  // checked here as well as at render.
  if (link.student_user_id === user.id) {
    console.error("Guardian confirmation refused: student redeemed own link.", {
      linkId: link.id,
    });
    redirect("/guardian/accept?status=failed");
  }

  const nowIso = new Date().toISOString();

  // The token_redeemed_at guard makes this a conditional write: if another
  // request redeemed the same link between the check above and this update,
  // zero rows match and nothing is double-redeemed.
  const { data: updated, error: updateError } = await admin
    .from("guardian_links")
    .update({
      guardian_user_id: user.id,
      status: "verified",
      verified_at: nowIso,
      token_redeemed_at: nowIso,
    })
    .eq("id", link.id)
    .is("token_redeemed_at", null)
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    console.error("Guardian confirmation write failed:", {
      linkId: link.id,
      error: updateError?.message ?? "no row matched the conditional update",
    });
    redirect("/guardian/accept?status=failed");
  }

  revalidatePath("/", "layout");
  redirect("/guardian/accept?status=confirmed");
}
