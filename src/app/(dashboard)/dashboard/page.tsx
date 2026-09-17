import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProgress, summarize, type ProgressBySlug } from "@/lib/progress";
import type { Stage } from "@/lib/curriculum";
import { loadCurriculum } from "@/lib/curriculum-store";
import {
  loadAssessableObjectives,
  loadMastery,
  masterySummary,
  type MasteryByObjective,
} from "@/lib/objective-mastery";
import { SignOutButton } from "@/components/sign-out-button";
import { LessonRow } from "@/components/lesson-row";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Dashboard — PilotPathway.ai",
};

export default async function DashboardPage() {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [progress, profileResult, stages, mastery, assessable] =
    await Promise.all([
      getProgress(user.id),
      supabase
        .from("profiles")
        .select("date_of_birth")
        .eq("id", user.id)
        .maybeSingle(),
      loadCurriculum(supabase),
      loadMastery(supabase, user.id),
      loadAssessableObjectives(supabase),
    ]);

  // Every account created before the age gate has no date of birth, and
  // is_adult() treats unknown age as a minor. Nothing else ever sends those
  // students to the profile page, so they would stay unable to approve
  // anything for themselves indefinitely. The prompt disappears on its own
  // once a date is saved.
  //
  // Shown only when the read succeeded and the value is genuinely empty. A
  // failed read says nothing about the student, and nagging them over our own
  // error would be wrong.
  const needsDateOfBirth =
    !profileResult.error &&
    typeof profileResult.data?.date_of_birth !== "string";

  // No stages means the curriculum could not be read. Fail loudly rather than
  // render an empty dashboard that looks like there is nothing to learn.
  if (stages.length === 0) {
    throw new Error("The curriculum could not be loaded.");
  }

  // A stage appears in full as soon as it has at least one lesson in the
  // database, so adding lessons to Stage 2 or 3 in the Table Editor shows them
  // here with no code change. A stage with none yet stays a "coming soon" card.
  const openStages = stages.filter((stage) => stage.lessons.length > 0);
  const upcomingStages = stages.filter((stage) => stage.lessons.length === 0);

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            PilotPathway.ai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/profile"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Profile
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Welcome</h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>

        {needsDateOfBirth ? (
          <section className="border-gold/40 bg-gold/10 mt-8 flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Add your date of birth</h2>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                It takes a few seconds, and it tells us which features you can
                turn on yourself. Your lessons stay open either way.
              </p>
            </div>
            <Button
              asChild
              className="bg-gold text-gold-foreground hover:bg-gold/90 shrink-0"
            >
              <Link href="/profile">Add it now</Link>
            </Button>
          </section>
        ) : null}

        {openStages.map((stage) => (
          <StageSection
            key={stage.slug}
            stage={stage}
            progress={progress}
            mastery={mastery}
            assessable={assessable}
          />
        ))}

        {upcomingStages.length > 0 ? (
          <section className="mt-8 grid gap-4 sm:grid-cols-2">
            {upcomingStages.map((stage) => (
              <article
                key={stage.slug}
                className="border-border bg-muted/40 rounded-lg border border-dashed p-6"
              >
                <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
                  Stage {stage.number} — coming soon
                </span>
                <h3 className="mt-1 font-semibold">{stage.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm text-pretty">
                  {stage.tagline}
                </p>
              </article>
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StageSection({
  stage,
  progress,
  mastery,
  assessable,
}: {
  stage: Stage;
  progress: ProgressBySlug;
  mastery: MasteryByObjective;
  assessable: Set<string>;
}) {
  const stats = summarize(
    stage.lessons.map((lesson) => lesson.slug),
    progress,
  );

  // Marking a lesson complete is the student saying they went through it.
  // This is the part they had to show. It counts only objectives with an
  // approved quiz behind them, so an objective nobody has written a card for
  // yet is not held against the student.
  const shown = masterySummary(
    stage.lessons.flatMap((lesson) =>
      lesson.objectives.map((objective) => objective.id),
    ),
    assessable,
    mastery,
  );

  return (
    <section className="border-border bg-card mt-10 rounded-lg border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
            Stage {stage.number}
          </span>
          <h2 className="mt-1 text-xl font-semibold">{stage.title}</h2>
        </div>
        <div className="text-muted-foreground text-sm sm:text-right">
          <p>
            {stats.completed} of {stats.total} lessons complete
          </p>
          {shown.available > 0 ? (
            <p className="mt-0.5">
              {shown.shown} of {shown.available} objectives shown
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        {stage.tagline}
      </p>

      <div
        className="bg-muted mt-5 h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={stats.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Stage ${stage.number} progress`}
      >
        <div
          className="bg-gold h-full rounded-full transition-[width]"
          style={{ width: `${stats.percent}%` }}
        />
      </div>

      <ol className="mt-8 flex flex-col gap-2">
        {stage.lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.slug}
            index={index + 1}
            stageSlug={stage.slug}
            lesson={lesson}
            status={progress.get(lesson.slug) ?? "not_started"}
          />
        ))}
      </ol>
    </section>
  );
}
