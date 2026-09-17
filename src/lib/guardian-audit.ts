import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The permanent record of a guardian acting on a minor's account, written to
 * `guardian_actions` (migration 0019).
 *
 * The record is started BEFORE the action and the caller must not act if
 * starting it fails: an untraced deletion or download is worse than a refused
 * one. The outcome is settled afterwards. Settling is best-effort — the action
 * has already happened by then, so a failure is logged rather than reported
 * to the guardian, and the row stays at 'started' as an honest "attempted,
 * result not recorded".
 */

export type GuardianAction = "delete_account" | "export_data";

export async function startGuardianAction(
  admin: SupabaseClient,
  details: {
    action: GuardianAction;
    guardianId: string;
    guardianEmail: string | null;
    studentId: string;
    verificationMethod: string;
  },
): Promise<number> {
  const { data, error } = await admin
    .from("guardian_actions")
    .insert({
      action: details.action,
      guardian_user_id: details.guardianId,
      guardian_email: details.guardianEmail,
      student_user_id: details.studentId,
      verification_method: details.verificationMethod,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`guardian action record: ${error.message}`);
  }

  const id: unknown = data?.id;

  if (typeof id !== "number") {
    throw new Error("guardian action record: no id returned");
  }

  return id;
}

export async function settleGuardianAction(
  admin: SupabaseClient,
  recordId: number,
  outcome: "completed" | "failed",
): Promise<void> {
  const { error } = await admin
    .from("guardian_actions")
    .update({ outcome, finished_at: new Date().toISOString() })
    .eq("id", recordId);

  if (error) {
    console.error("Guardian action record could not be settled:", {
      recordId,
      outcome,
      error: error.message,
    });
  }
}
