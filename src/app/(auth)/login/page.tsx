import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { logIn } from "../actions";
import { SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";

export const metadata = {
  title: "Log in — PilotPathway.ai",
};

const ERROR_MESSAGES: Record<string, string> = {
  auth_failed:
    "That confirmation link did not work. It may have expired or already been used — sign up again to get a fresh one.",
  missing_code: "That link looks incomplete. Open the most recent email we sent you.",
  not_configured: SUPABASE_SETUP_MESSAGE,
};

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Pick up where you left off.
        </p>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {errorMessage}
        </p>
      ) : null}

      <AuthForm
        action={logIn}
        submitLabel="Log in"
        pendingLabel="Logging in…"
        next={next}
      />

      <p className="text-muted-foreground text-sm">
        New here?{" "}
        <Link href="/signup" className="text-foreground font-medium underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
