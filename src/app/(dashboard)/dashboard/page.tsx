import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProgress, summarize } from "@/lib/progress";
import { stages } from "@/lib/curriculum";
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

  const [progress, profileResult] = await Promise.all([
    getProgress(user.id),
    supabase
      .from("profiles")
      .select("date_of_birth")
      .eq("id", user.id)
      .maybeSingle(),
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

  const stageOne = stages[0];
  const stats = summarize(
    stageOne.lessons.map((lesson) => lesson.slug),
    progress,
  );

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

        <section className="border-border bg-card mt-10 rounded-lg border p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
                Stage {stageOne.number}
              </span>
              <h2 className="mt-1 text-xl font-semibold">{stageOne.title}</h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {stats.completed} of {stats.total} lessons complete
            </p>
          </div>

          <p className="text-muted-foreground mt-3 text-sm text-pretty">
            {stageOne.tagline}
          </p>

          <div
            className="bg-muted mt-5 h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={stats.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Stage ${stageOne.number} progress`}
          >
            <div
              className="bg-gold h-full rounded-full transition-[width]"
              style={{ width: `${stats.percent}%` }}
            />
          </div>

          <ol className="mt-8 flex flex-col gap-2">
            {stageOne.lessons.map((lesson, index) => (
              <LessonRow
                key={lesson.slug}
                index={index + 1}
                stageSlug={stageOne.slug}
                lesson={lesson}
                status={progress.get(lesson.slug) ?? "not_started"}
              />
            ))}
          </ol>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          {stages.slice(1).map((stage) => (
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
      </div>
    </main>
  );
}
