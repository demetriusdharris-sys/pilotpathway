import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { NewPasswordForm } from "@/components/new-password-form";

export const metadata = {
  title: "Choose a new password — PilotPathway.ai",
};

/**
 * Reached from the recovery link, which the callback has already exchanged for
 * a session. Without that session there is nothing to set a password on, so
 * the page says so plainly and offers another link rather than showing a form
 * that would fail on submit.
 */
export default async function ResetPasswordPage() {
  let signedIn = false;

  if (getSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = user !== null;
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">That link has expired</h1>
          <p className="text-muted-foreground text-sm text-pretty">
            Reset links work once and do not last long — that is what keeps your
            account yours. Ask for a fresh one and it will arrive in a moment.
          </p>
        </div>

        <Link
          href="/forgot-password"
          className="text-foreground font-medium underline"
        >
          Send me a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Choose a new password</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Once you save it you are logged in and back where you left off.
        </p>
      </div>

      <NewPasswordForm />
    </div>
  );
}
