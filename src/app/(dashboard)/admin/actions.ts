"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setReviewerRole } from "@/lib/admin";
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
