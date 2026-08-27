import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";

export const metadata = {
  title: "Create your account — PilotPathway.ai",
};

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Start your ground school</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Free, and yours to keep. Stage 1 opens as soon as you are in.
        </p>
      </div>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        passwordHint="At least 8 characters."
      />

      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
