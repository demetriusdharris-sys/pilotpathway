import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { FULL_TEST_MINUTES, loadAttempt } from "@/lib/practice/attempts";
import { PracticeRunner } from "@/components/practice-runner";

export const metadata = {
  title: "Practice test — PilotPathway.ai",
};

export default async function PracticeAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  if (!getSupabaseEnv()) redirect("/login");

  const { attemptId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/practice/${attemptId}`);

  const admin = createAdminClient();

  if (!admin) {
    throw new Error("Practice tests are unavailable right now.");
  }

  const attempt = await loadAttempt(admin, user.id, attemptId);

  if (!attempt) notFound();

  // A submitted attempt has results; sending the student back into the paper
  // would let them change answers after seeing their score.
  if (attempt.completedAt) {
    redirect(`/practice/${attemptId}/results`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Link
        href="/practice"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Leave the test
      </Link>
      <p className="text-muted-foreground mt-2 text-xs text-pretty">
        Leaving does not lose anything. Your answers are saved as you go.
      </p>

      <div className="mt-8">
        <PracticeRunner
          attempt={attempt}
          timedMinutes={attempt.mode === "full_60" ? FULL_TEST_MINUTES : null}
        />
      </div>
    </main>
  );
}
