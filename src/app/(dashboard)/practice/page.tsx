import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getBankHealth, FULL_TEST_QUESTIONS } from "@/lib/practice/assemble";
import {
  FULL_TEST_MINUTES,
  loadAttemptHistory,
  PASSING_PERCENT,
} from "@/lib/practice/attempts";
import { PracticeStartForm } from "@/components/practice-start-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Practice tests — PilotPathway.ai",
};

function day(value: string): string {
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "—";
}

const MODE_LABEL: Record<string, string> = {
  full_60: "Full test",
  quick_20: "Quick test",
  targeted: "Targeted practice",
};

export default async function PracticePage() {
  if (!getSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/practice");

  const [health, history] = await Promise.all([
    getBankHealth(supabase),
    loadAttemptHistory(supabase, user.id),
  ]);

  const approved = health.reduce((total, entry) => total + entry.approved, 0);
  const areasWithQuestions = health
    .filter((entry) => entry.approved > 0)
    .map((entry) => entry.area);

  // A full test needs every area filled; anything less would be a test that
  // silently leaves out regulations or weather, which is worse than no test.
  const canSitFullTest = health
    .filter((entry) => entry.slots > 0)
    .every((entry) => entry.approved >= entry.slots);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            PilotPathway.ai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          Knowledge test
        </span>
        <h1 className="mt-1 text-3xl font-semibold">Practice tests</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          Free, always. The real Private Pilot knowledge test is{" "}
          {FULL_TEST_QUESTIONS} scored questions in {FULL_TEST_MINUTES / 60}{" "}
          hours, and passes at {PASSING_PERCENT}%. No two practice tests here
          are the same, and questions you got wrong come back later on purpose.
        </p>

        {approved === 0 ? (
          <section className="border-gold/40 bg-gold/10 mt-8 rounded-lg border p-6">
            <h2 className="font-semibold">Not open yet</h2>
            <p className="mt-2 text-sm text-pretty">
              Every practice question is written by us and checked by a
              certificated flight instructor before any student sees it. None
              have been signed off yet, so there is nothing to serve — and we
              would rather show you nothing than something unchecked.
            </p>
            <p className="mt-3 text-sm text-pretty">
              In the meantime, the lessons and Captain Path are open as usual.
            </p>
          </section>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <section className="border-border bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold">Full test</h2>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                {FULL_TEST_QUESTIONS} questions, timed at {FULL_TEST_MINUTES}{" "}
                minutes, spread across the knowledge areas the way the real test
                is.
              </p>
              <div className="mt-4">
                {canSitFullTest ? (
                  <PracticeStartForm mode="full_60" label="Start a full test" />
                ) : (
                  <p className="text-muted-foreground text-sm text-pretty">
                    Not enough approved questions yet to build a full test
                    honestly. Targeted practice below works on the areas that
                    are ready.
                  </p>
                )}
              </div>
            </section>

            <section className="border-border bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold">Quick test</h2>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                20 questions, untimed, same spread. Good for a bus ride.
              </p>
              <div className="mt-4">
                <PracticeStartForm mode="quick_20" label="Start a quick test" />
              </div>
            </section>

            <section className="border-border bg-card rounded-lg border p-6">
              <h2 className="text-xl font-semibold">Targeted practice</h2>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                One knowledge area at a time — useful straight after a lesson,
                or on whatever your last result said to review.
              </p>
              <div className="mt-4">
                <PracticeStartForm
                  mode="targeted"
                  label="Start targeted practice"
                  areas={areasWithQuestions}
                />
              </div>
            </section>
          </div>
        )}

        {history.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
              Your tests
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {history.map((attempt) => (
                <li
                  key={attempt.id}
                  className="border-border flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">
                      {MODE_LABEL[attempt.mode] ?? attempt.mode}
                    </span>
                    {attempt.target ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · {attempt.target}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground">
                      {" "}
                      · {day(attempt.startedAt)}
                    </span>
                  </span>

                  {attempt.completedAt ? (
                    <Link
                      href={`/practice/${attempt.id}/results`}
                      className="font-medium underline underline-offset-4"
                    >
                      {attempt.rawScore} of {attempt.questionCount} — see result
                    </Link>
                  ) : (
                    <Link
                      href={`/practice/${attempt.id}`}
                      className="text-gold-strong font-medium underline underline-offset-4"
                    >
                      Finish this one
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
