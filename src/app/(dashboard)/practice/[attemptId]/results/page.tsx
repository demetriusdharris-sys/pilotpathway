import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadResult, PASSING_PERCENT } from "@/lib/practice/attempts";
import { Button } from "@/components/ui/button";
import { loadReadiness } from "@/lib/practice/readiness";
import { findLessonStageSlug } from "@/lib/curriculum-store";
import { ReadinessPanel } from "@/components/readiness-panel";

export const metadata = {
  title: "Your result — PilotPathway.ai",
};

export default async function PracticeResultPage({
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

  if (!user) redirect(`/login?next=/practice/${attemptId}/results`);

  const admin = createAdminClient();

  if (!admin) {
    throw new Error("Practice tests are unavailable right now.");
  }

  const result = await loadResult(admin, user.id, attemptId);

  if (!result) notFound();

  // Deliberately computed across every test this student has taken, not from
  // the one they just sat: a single attempt's percentage is the number this
  // whole module exists to stop them acting on.
  const readiness = await loadReadiness(admin, user.id);
  const lessonLinks: Record<string, string> = {};

  for (const code of readiness.weakCodes.slice(0, 5)) {
    if (!code.lessonSlug || lessonLinks[code.lessonSlug]) continue;
    const stage = await findLessonStageSlug(supabase, code.lessonSlug);
    if (stage) lessonLinks[code.lessonSlug] = stage;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link
        href="/practice"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Practice tests
      </Link>

      <section className="border-border bg-card mt-8 rounded-lg border p-6">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          {result.passed
            ? "Above the passing score"
            : "Below the passing score"}
        </span>
        <h1 className="mt-1 text-3xl font-semibold">
          {result.rawScore} of {result.questionCount} — {result.percent}%
        </h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          The FAA knowledge test passes at {PASSING_PERCENT}%. This is practice,
          so treat it as a signal rather than a prediction — one test is thin
          evidence either way.
        </p>
      </section>

      <ReadinessPanel report={readiness} lessonLinks={lessonLinks} />

      {/* Laid out like the Airman Knowledge Test Report, which is the document
          a student hands their examiner. Recognising the format before test
          day is worth something on its own. */}
      <section className="border-border bg-card mt-8 rounded-lg border p-6">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          Knowledge areas to review
        </h2>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          On the real report, your examiner sees a list like this and may ask
          about any of it in the oral. Empty is good.
        </p>

        {result.missedAcsCodes.length === 0 ? (
          <p className="mt-4 text-sm">Nothing missed on this test.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-border border-b text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Code
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold">
                    Area
                  </th>
                  <th scope="col" className="py-2 text-right font-semibold">
                    Missed
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.missedAcsCodes.map((entry) => (
                  <tr key={entry.acsCode} className="border-border border-b">
                    <td className="py-2 pr-4 font-mono text-xs">
                      {entry.acsCode}
                    </td>
                    <td className="py-2 pr-4">{entry.knowledgeArea}</td>
                    <td className="py-2 text-right tabular-nums">
                      {entry.missed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-border bg-card mt-8 rounded-lg border p-6">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          How each area went
        </h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {result.byArea.map((area) => (
            <li key={area.area} className="flex justify-between gap-4">
              <span className="text-pretty">{area.area}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {area.correct} of {area.asked}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          Every question
        </h2>
        <ol className="mt-4 flex flex-col gap-4">
          {result.review.map((item) => (
            <li
              key={item.position}
              className={`border-border rounded-lg border p-5 ${
                item.isCorrect === true ? "" : "border-l-gold-strong border-l-4"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-muted-foreground text-xs">
                  Question {item.position} · {item.knowledgeArea}
                </span>
                <span
                  className={`text-xs font-semibold tracking-[0.08em] uppercase ${
                    item.isCorrect === true
                      ? "text-muted-foreground"
                      : "text-gold-strong"
                  }`}
                >
                  {item.isCorrect === true
                    ? "Correct"
                    : item.isCorrect === false
                      ? "Missed"
                      : "Not answered"}
                </span>
              </div>

              <p className="mt-2 text-sm text-pretty">{item.stem}</p>

              {item.figureRef ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  {item.figureRef}
                  {item.figureSupplement ? ` · ${item.figureSupplement}` : ""}
                </p>
              ) : null}

              {item.isCorrect !== true ? (
                <p className="text-muted-foreground mt-3 text-sm text-pretty">
                  <span className="text-foreground font-medium">
                    You chose:
                  </span>{" "}
                  {item.yourAnswer ?? "nothing"}
                </p>
              ) : null}

              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                <span className="text-foreground font-medium">
                  Correct answer:
                </span>{" "}
                {item.correctAnswer}
              </p>

              <p className="mt-3 text-sm text-pretty">{item.explanation}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/practice">Take another</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to lessons</Link>
        </Button>
      </div>
    </main>
  );
}
