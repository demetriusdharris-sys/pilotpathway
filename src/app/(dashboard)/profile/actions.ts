"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dateOfBirthError } from "@/lib/date-of-birth";
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
