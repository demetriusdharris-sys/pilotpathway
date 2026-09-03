import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";

export const metadata = {
  title: "Create your account — PilotPathway.ai",
};

/**
 * Latest date of birth that clears the 13+ gate, as `YYYY-MM-DD`.
 *
 * Computed here on the server and handed to the form as a prop. A date
 * computed inside the client component would be derived twice — once on the
 * server pass, once on the client — and the two straddle a midnight boundary,
 * which React reports as a hydration mismatch.
 *
 * Built from local calendar parts rather than by subtracting milliseconds, so
 * no UTC round-trip can shift the day backward.
 */
function maxDateOfBirth(): string {
  const today = new Date();
  const year = today.getFullYear() - 13;
  const month = today.getMonth();
  // Feb 29 has no counterpart 13 years back. Clamping down to the last real
  // day of the month keeps the gate on the safe side, rather than emitting a
  // date that does not exist and that the browser would ignore.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(today.getDate(), lastDayOfMonth);

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

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
        askFirstName
        askDateOfBirth
        maxDateOfBirth={maxDateOfBirth()}
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
