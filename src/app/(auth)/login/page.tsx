import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { logIn } from "../actions";

export const metadata = {
  title: "Log in — PilotPathway.ai",
};

export default async function LogInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          Pick up where you left off.
        </p>
      </div>

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
