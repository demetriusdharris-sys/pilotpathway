"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, setReviewerRole } from "@/lib/admin";
import { setReportStatus } from "@/lib/content-reports";
import type { AuthState } from "@/app/(auth)/actions";

/**
 * Grants or removes reviewer access.
 *
 * Uses the caller's own client: `set_reviewer_role` checks `may_administer()`
 * from `auth.uid()`, and it records the change against that same id. The
 * service role would both bypass the check and leave the record unable to say
 * who acted.
 */
export async function grantReviewerAccess(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "");

  if (!email) {
    return { error: "Type the email address they signed up with." };
  }

  if (role !== "mentor" && role !== "student") {
    return { error: "Choose whether to grant or remove reviewer access." };
  }

  let message: string;

  try {
    message = await setReviewerRole(supabase, email, role);
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Role change failed:", {
      actorId: user.id,
      role,
      error: raised,
    });

    return { error: raised };
  }

  revalidatePath("/admin");

  return { message };
}

/**
 * Triages a student report.
 *
 * Changes the report's status and nothing else. There is deliberately no path
 * from here to the reported content: deciding a card needs changing happens in
 * the review queue, where whoever decides has the card in front of them.
 */
export async function triageReport(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again." };
  }

  if (!(await isAdmin(supabase))) {
    return { error: "This is for administrators." };
  }

  const admin = createAdminClient();

  if (!admin) {
    return { error: "Unavailable right now." };
  }

  const reportId = Number.parseInt(String(formData.get("reportId") ?? ""), 10);
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("note") ?? "");

  if (!Number.isInteger(reportId)) {
    return { error: "Nothing was recorded." };
  }

  if (status !== "triaged" && status !== "actioned" && status !== "dismissed") {
    return { error: "Nothing was recorded." };
  }

  try {
    await setReportStatus(admin, reportId, status, note);
  } catch (error) {
    console.error("Report triage failed:", {
      actorId: user.id,
      reportId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "Could not save that." };
  }

  revalidatePath("/admin");

  return { message: "Saved." };
}
