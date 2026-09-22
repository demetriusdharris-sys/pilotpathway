"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateOfBirthError } from "@/lib/date-of-birth";
import { isDeleteConfirmed } from "@/lib/account-deletion";
import { authorizeGuardianAction } from "@/lib/guardian-access";
import {
  settleGuardianAction,
  startGuardianAction,
} from "@/lib/guardian-audit";
import { SCHOOL_PROGRESS_SCOPE, studentBelongsTo } from "@/lib/school-sharing";
import type { AuthState } from "@/app/(auth)/actions";

/**
 * Updates the two fields a student owns about themselves.
 *
 * Only first_name and date_of_birth are ever written. email, display_name,
 * id and created_at are never sent — and the column GRANT on public.profiles
 * would refuse id and created_at with 42501 even if this code were wrong. The
 * grant is the control; this is the polite version of it.
 *
 * Uses the caller's own client, not the admin client. RLS scopes the row to
 * the signed-in student, and the grant scopes the columns. Reaching for the
 * service role here would bypass both for no reason.
 */
export async function updateProfile(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again to save your profile." };
  }

  const firstName = String(formData.get("firstName") ?? "")
    .trim()
    .slice(0, 60);

  const submittedDateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();

  // What is already on file decides whether date of birth may be written at
  // all. Read it here rather than trusting the form: a stale page, or a
  // hand-made request, must not be able to overwrite a date already set.
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) {
    console.error("Profile read failed:", {
      userId: user.id,
      error: readError.message,
    });
    return { error: "We could not load your profile just now. Try again." };
  }

  const dateOfBirthOnFile =
    typeof existing?.date_of_birth === "string" ? existing.date_of_birth : null;

  const updates: {
    first_name: string | null;
    updated_at: string;
    date_of_birth?: string;
  } = {
    first_name: firstName === "" ? null : firstName,
    updated_at: new Date().toISOString(),
  };

  // Date of birth is write-once. Once set it drives is_adult() and guardian
  // consent, so letting a student edit it later would let a minor age
  // themselves up and out of the protections built for them.
  if (dateOfBirthOnFile === null && submittedDateOfBirth !== "") {
    const ageError = dateOfBirthError(submittedDateOfBirth);

    if (ageError) {
      return { error: ageError };
    }

    updates.date_of_birth = submittedDateOfBirth;
  }

  const { error: writeError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  if (writeError) {
    console.error("Profile update failed:", {
      userId: user.id,
      code: writeError.code,
      error: writeError.message,
    });

    // 42501 is the column GRANT refusing a write. If it ever appears here it
    // means this function tried to write something it is not allowed to.
    if (writeError.code === "42501") {
      return { error: "That change is not allowed on your account." };
    }

    return { error: "We could not save that just now. Try again." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { message: "Saved." };
}

/**
 * Permanently deletes the signed-in account and everything attached to it.
 *
 * Deleting the auth user is what does the work: the foreign keys cascade the
 * student's rows away, and the trigger from 0017 first revokes (not erases)
 * any consent this account gave for someone else. See CLAUDE.md, "Migration
 * 0017".
 *
 * Two checks, because there is no undo:
 *
 *   - The confirmation word, re-checked here. The disabled button in the
 *     form is a convenience, not a control.
 *   - The account's password. A signed-in session alone is not enough: on a
 *     shared or unlocked device, whoever is holding it could otherwise erase
 *     a student's entire record.
 */
export async function deleteAccount(
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

  if (!isDeleteConfirmed(String(formData.get("confirmation") ?? ""))) {
    return { error: "Type DELETE to confirm." };
  }

  const password = String(formData.get("password") ?? "");

  if (!password || !user.email) {
    return { error: "Enter your password to confirm." };
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (passwordError) {
    return {
      error: "That password is not right. Your account was not deleted.",
    };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Account deletion blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return {
      error:
        "Your account could not be deleted right now. This is on our side, not yours. Nothing was removed.",
    };
  }

  // shouldSoftDelete MUST be false. A soft delete keeps the auth.users row,
  // so none of the cascades run and every table keeps the student's data —
  // an account that looks deleted while its record stays intact.
  const { error: deleteError } = await admin.auth.admin.deleteUser(
    user.id,
    false,
  );

  if (deleteError) {
    console.error("Account deletion failed:", {
      userId: user.id,
      error: deleteError.message,
    });
    return {
      error:
        "Your account could not be deleted right now. Nothing was removed. Try again shortly.",
    };
  }

  // The session now points at an account that no longer exists. Clear the
  // cookies locally; a failure here must not undo or hide a completed delete.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Deliberately ignored — the account is already gone.
  }

  revalidatePath("/", "layout");
  redirect("/account-deleted");
}

/**
 * A verified guardian permanently deleting a minor's account.
 *
 * The form names a student; that is all it does. Whether this guardian may
 * delete that student is decided here, by authorizeGuardianAction, against
 * the database as it stands at the moment of deleting — never by the fact
 * that the form was shown.
 *
 * Same two checks as a student deleting their own account: the confirmation
 * word, and the guardian's own password.
 */
export async function deleteStudentAccount(
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

  const studentId = String(formData.get("studentId") ?? "").trim();

  if (!studentId) {
    return { error: "Nothing was deleted." };
  }

  if (!isDeleteConfirmed(String(formData.get("confirmation") ?? ""))) {
    return { error: "Type DELETE to confirm." };
  }

  const password = String(formData.get("password") ?? "");

  if (!password || !user.email) {
    return { error: "Enter your password to confirm." };
  }

  const { error: passwordError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (passwordError) {
    return {
      error: "That password is not right. Nothing was deleted.",
    };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian deletion blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return {
      error:
        "This account could not be deleted right now. This is on our side, not yours. Nothing was removed.",
    };
  }

  let student;
  try {
    student = await authorizeGuardianAction(admin, user.id, studentId);
  } catch (error) {
    console.error("Guardian deletion authorization failed:", {
      guardianId: user.id,
      studentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error:
        "This account could not be deleted right now. Nothing was removed. Try again shortly.",
    };
  }

  if (!student || !student.canDelete) {
    return { error: "You can't delete this account. Nothing was removed." };
  }

  // A third party deleting a minor's account must leave a permanent record.
  // Written before the delete; if it cannot be written, nothing is deleted.
  let recordId: number;
  try {
    recordId = await startGuardianAction(admin, {
      action: "delete_account",
      guardianId: user.id,
      guardianEmail: user.email ?? null,
      studentId,
      verificationMethod: student.verificationMethod,
    });
  } catch (error) {
    console.error("Guardian deletion blocked: audit record failed:", {
      guardianId: user.id,
      studentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      error:
        "This account could not be deleted right now. Nothing was removed. Try again shortly.",
    };
  }

  // shouldSoftDelete MUST be false, for the same reason as deleteAccount: a
  // soft delete keeps the auth.users row and none of the cascades run.
  const { error: deleteError } = await admin.auth.admin.deleteUser(
    studentId,
    false,
  );

  if (deleteError) {
    await settleGuardianAction(admin, recordId, "failed");
    console.error("Guardian deletion failed:", {
      guardianId: user.id,
      studentId,
      error: deleteError.message,
    });
    return {
      error:
        "This account could not be deleted right now. Nothing was removed. Try again shortly.",
    };
  }

  await settleGuardianAction(admin, recordId, "completed");

  console.info("Guardian deleted student account:", {
    recordId,
    guardianId: user.id,
    studentId,
    verificationMethod: student.verificationMethod,
  });

  revalidatePath("/profile");

  return { message: "Their account has been deleted." };
}

/**
 * A student agreeing to share their progress with one named organisation.
 *
 * Written with the student's own client, not the service role: the INSERT
 * policy from 0007 is what establishes that a person may only grant consent
 * for themselves, and going around it would make that policy decorative.
 *
 * Consent is per organisation. The form names one, and 0021's constraint
 * refuses a school_progress grant that names none.
 */
export async function shareProgressWithSchool(
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

  if (!organizationId) {
    return { error: "Nothing was shared." };
  }

  // A second live grant for the same school would leave two rows to revoke,
  // and revoking one would look like it had worked.
  const { data: existing, error: readError } = await supabase
    .from("consent")
    .select("id")
    .eq("subject_user_id", user.id)
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .eq("audience_org_id", organizationId)
    .is("revoked_at", null)
    .limit(1);

  if (readError) {
    console.error("Consent read failed:", {
      userId: user.id,
      error: readError.message,
    });
    return { error: "We could not save that just now. Try again." };
  }

  if (existing && existing.length > 0) {
    revalidatePath("/profile");
    return { message: "You are already sharing your progress with them." };
  }

  const { error: writeError } = await supabase.from("consent").insert({
    subject_user_id: user.id,
    granted_by: user.id,
    granted_by_relationship: "self",
    scope_key: SCHOOL_PROGRESS_SCOPE,
    audience_org_id: organizationId,
  });

  if (writeError) {
    console.error("Consent grant failed:", {
      userId: user.id,
      organizationId,
      code: writeError.code,
      error: writeError.message,
    });
    return { error: "We could not save that just now. Try again." };
  }

  revalidatePath("/profile");

  return { message: "Your progress is now shared with them." };
}

/**
 * Taking it back.
 *
 * Revocation sets revoked_at on the grant itself — the record of what was
 * agreed, and when it ended, is kept. There are deliberately no client UPDATE
 * policies on consent (0006), so this is the one part that needs the service
 * role, and it is scoped to the signed-in student's own live grant for the
 * named organisation.
 */
export async function stopSharingProgress(
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

  if (!organizationId) {
    return { error: "Nothing was changed." };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Consent revocation blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return {
      error:
        "We could not change that just now. This is on our side, not yours. Nothing was changed.",
    };
  }

  const { data, error } = await admin
    .from("consent")
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: "Revoked by the student.",
    })
    .eq("subject_user_id", user.id)
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .eq("audience_org_id", organizationId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    console.error("Consent revocation failed:", {
      userId: user.id,
      organizationId,
      error: error.message,
    });
    return { error: "We could not change that just now. Try again." };
  }

  revalidatePath("/profile");

  if (!data || data.length === 0) {
    return { message: "You were not sharing your progress with them." };
  }

  return { message: "They can no longer see your progress." };
}

/**
 * A verified guardian sharing a minor's progress with their school.
 *
 * Three checks, in this order, and none of them trusts the form:
 *
 *   1. authorizeGuardianAction — is this a verified guardian of that student,
 *      right now, and is the student a known minor? Same gate as the delete.
 *   2. studentBelongsTo — is the organisation one the student is enrolled at?
 *      The database does not check this: the consent policy checks the
 *      guardian, and 0021's constraint only requires that some organisation is
 *      named. Without this a guardian could consent to any organisation id.
 *   3. The INSERT itself goes through the guardian's own client, so the policy
 *      from 0007 is what finally allows or refuses it.
 *
 * The grant records granted_by and granted_by_relationship = 'guardian', so
 * who agreed on the student's behalf is part of the permanent record — and the
 * student can revoke it themselves from their own profile.
 */
export async function shareStudentProgress(
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

  const studentId = String(formData.get("studentId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!studentId || !organizationId) {
    return { error: "Nothing was shared." };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian sharing blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return {
      error:
        "We could not change that just now. This is on our side, not yours. Nothing was changed.",
    };
  }

  let student;
  try {
    student = await authorizeGuardianAction(admin, user.id, studentId);

    if (
      student &&
      student.canShare &&
      !(await studentBelongsTo(admin, studentId, organizationId))
    ) {
      return { error: "That school is not one they are enrolled at." };
    }
  } catch (error) {
    console.error("Guardian sharing authorization failed:", {
      guardianId: user.id,
      studentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "We could not change that just now. Try again." };
  }

  if (!student || !student.canShare) {
    return { error: "You can't change sharing for this account." };
  }

  const { data: existing, error: readError } = await admin
    .from("consent")
    .select("id")
    .eq("subject_user_id", studentId)
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .eq("audience_org_id", organizationId)
    .is("revoked_at", null)
    .limit(1);

  if (readError) {
    console.error("Guardian consent read failed:", {
      guardianId: user.id,
      studentId,
      error: readError.message,
    });
    return { error: "We could not change that just now. Try again." };
  }

  if (existing && existing.length > 0) {
    revalidatePath("/profile");
    return { message: "Their progress is already shared with that school." };
  }

  const { error: writeError } = await supabase.from("consent").insert({
    subject_user_id: studentId,
    granted_by: user.id,
    granted_by_relationship: "guardian",
    scope_key: SCHOOL_PROGRESS_SCOPE,
    audience_org_id: organizationId,
  });

  if (writeError) {
    console.error("Guardian consent grant failed:", {
      guardianId: user.id,
      studentId,
      organizationId,
      code: writeError.code,
      error: writeError.message,
    });
    return { error: "We could not save that just now. Try again." };
  }

  console.info("Guardian shared student progress:", {
    guardianId: user.id,
    studentId,
    organizationId,
    verificationMethod: student.verificationMethod,
  });

  revalidatePath("/profile");

  return { message: "Their progress is now shared with that school." };
}

/**
 * A guardian taking that back. Also usable on a grant the student made
 * themselves: revoking shares less, which is the safe direction for a minor,
 * and the student can always share again from their own profile.
 */
export async function stopStudentProgressSharing(
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

  const studentId = String(formData.get("studentId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!studentId || !organizationId) {
    return { error: "Nothing was changed." };
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian sharing blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return {
      error:
        "We could not change that just now. This is on our side, not yours. Nothing was changed.",
    };
  }

  let student;
  try {
    student = await authorizeGuardianAction(admin, user.id, studentId);
  } catch (error) {
    console.error("Guardian sharing authorization failed:", {
      guardianId: user.id,
      studentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return { error: "We could not change that just now. Try again." };
  }

  if (!student || !student.canShare) {
    return { error: "You can't change sharing for this account." };
  }

  const { data, error } = await admin
    .from("consent")
    .update({
      revoked_at: new Date().toISOString(),
      revocation_reason: "Revoked by the student's guardian.",
    })
    .eq("subject_user_id", studentId)
    .eq("scope_key", SCHOOL_PROGRESS_SCOPE)
    .eq("audience_org_id", organizationId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    console.error("Guardian consent revocation failed:", {
      guardianId: user.id,
      studentId,
      organizationId,
      error: error.message,
    });
    return { error: "We could not change that just now. Try again." };
  }

  console.info("Guardian stopped student progress sharing:", {
    guardianId: user.id,
    studentId,
    organizationId,
    rows: data?.length ?? 0,
  });

  revalidatePath("/profile");

  if (!data || data.length === 0) {
    return { message: "Their progress was not being shared with that school." };
  }

  return { message: "That school can no longer see their progress." };
}
