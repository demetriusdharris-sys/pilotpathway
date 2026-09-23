import Link from "next/link";
import { EmailOnlyForm } from "@/components/email-only-form";
import { requestPasswordReset } from "../actions";

export const metadata = {
  title: "Reset your password — PilotPathway.ai",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Reset your password</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Tell us the email you signed up with and we will send you a link to
          set a new password. Your lessons and progress stay exactly as they
          are.
        </p>
      </div>

      <EmailOnlyForm
        action={requestPasswordReset}
        submitLabel="Send me a reset link"
        pendingLabel="Sending…"
      />

      <p className="text-muted-foreground text-sm">
        Remembered it?{" "}
        <Link href="/login" className="text-foreground font-medium underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
