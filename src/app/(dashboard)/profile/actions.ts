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
    return { error: "That password is not right. Your account was not deleted." };
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
