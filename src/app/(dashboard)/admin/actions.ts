"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, setContentReviewer } from "@/lib/admin";
import { setReportStatus } from "@/lib/content-reports";
import { setPilotVetting } from "@/lib/pilots";
import {
  createOrganization,
  removeOrganizationMember,
  setOrganizationMember,
  unverifyOrganization,
  verifyOrganization,
} from "@/lib/organizations";
import type { AuthState } from "@/app/(auth)/actions";

/**
 * Grants or removes reviewer access.
 *
 * Uses the caller's own client: `set_content_reviewer` checks `may_administer()`
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
  const grant = String(formData.get("grant") ?? "");

  if (!email) {
    return { error: "Type the email address they signed up with." };
  }

  if (grant !== "yes" && grant !== "no") {
    return { error: "Choose whether to grant or remove reviewer access." };
  }

  let message: string;

  try {
    message = await setContentReviewer(supabase, email, grant === "yes");
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Reviewer capability change failed:", {
      actorId: user.id,
      grant,
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

/**
 * Records an attestation that a pilot's background check was done.
 *
 * The check itself is never entered and never stored — only that a named person
 * confirmed it, and when it is due again. The FAA vets a pilot's flying, not
 * their fitness to work with children, so this is a separate and deliberately
 * human judgement.
 */
export async function vetPilot(
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
  const status = String(formData.get("status") ?? "");
  const vettedBy = String(formData.get("vettedBy") ?? "").trim();
  const expires = String(formData.get("expires") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const allowed = ["unverified", "pending", "verified", "declined"] as const;

  if (!email || !(allowed as readonly string[]).includes(status)) {
    return { error: "Nothing was recorded." };
  }

  try {
    const message = await setPilotVetting(
      supabase,
      email,
      status as (typeof allowed)[number],
      vettedBy,
      expires || null,
      note || null,
    );

    revalidatePath("/admin");

    return { message };
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Pilot vetting failed:", {
      actorId: user.id,
      status,
      error: raised,
    });

    return { error: raised };
  }
}

/**
 * Creates a school. Administrators only, because staff of a school can
 * eventually read the progress of students who consent to share with them — so
 * whether this is a real school is a judgement a person makes, and a school
 * cannot register itself.
 */
export async function addOrganization(
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

  const name = String(formData.get("name") ?? "").trim();
  const orgType = String(formData.get("orgType") ?? "");
  const adminEmail = String(formData.get("adminEmail") ?? "").trim();

  if (!name) {
    return { error: "Give the school a name." };
  }

  const kinds = ["school", "district", "sponsor", "flight_school"];

  if (!kinds.includes(orgType)) {
    return { error: "Say what kind of organisation it is." };
  }

  try {
    const message = await createOrganization(
      supabase,
      name,
      orgType,
      adminEmail || null,
    );

    revalidatePath("/admin");

    return { message };
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Creating an organisation failed:", {
      actorId: user.id,
      error: raised,
    });

    return { error: raised };
  }
}

/**
 * Adds somebody to a school, changes their role, or removes them.
 *
 * Reachable by an administrator or by whoever runs that school — staff cannot
 * add staff, because that would let anyone with a classroom login widen who
 * sees student progress.
 */
export async function changeOrganizationMember(
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

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const orgRole = String(formData.get("orgRole") ?? "");
  const intent = String(formData.get("intent") ?? "set");

  if (!organizationId || !email) {
    return { error: "Type their email address." };
  }

  if (intent === "set" && !["member", "staff", "org_admin"].includes(orgRole)) {
    return { error: "Pick what they are at the school." };
  }

  try {
    const message =
      intent === "remove"
        ? await removeOrganizationMember(supabase, organizationId, email)
        : await setOrganizationMember(supabase, organizationId, email, orgRole);

    revalidatePath("/admin");
    revalidatePath("/visits");

    return { message };
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Changing a membership failed:", {
      actorId: user.id,
      intent,
      error: raised,
    });

    return { error: raised };
  }
}

/**
 * Confirms a school is real, or withdraws it.
 *
 * This is the judgement 0039 moved the gate to. A school can set itself up and
 * ask for a pilot straight away, because a visit touches no student — but it
 * cannot enrol a student, and no visit of its can be confirmed, until somebody
 * has checked it exists.
 */
export async function decideOnOrganization(
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

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");
  const verifiedBy = String(formData.get("verifiedBy") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!organizationId || (intent !== "verify" && intent !== "withdraw")) {
    return { error: "Nothing was recorded." };
  }

  try {
    const message =
      intent === "verify"
        ? await verifyOrganization(
            supabase,
            organizationId,
            verifiedBy,
            note || null,
          )
        : await unverifyOrganization(supabase, organizationId, note || null);

    revalidatePath("/admin");
    revalidatePath("/visits");

    return { message };
  } catch (error) {
    const raised = error instanceof Error ? error.message : String(error);

    console.error("Deciding on an organisation failed:", {
      actorId: user.id,
      intent,
      error: raised,
    });

    return { error: raised };
  }
}
