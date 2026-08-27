import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProgress, summarize } from "@/lib/progress";
import { stages } from "@/lib/curriculum";
import { SignOutButton } from "@/components/sign-out-button";
import { LessonRow } from "@/components/lesson-row";

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

  const progress = await getProgress(user.id);
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
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Welcome</h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>

        <section className="border-border bg-card mt-10 rounded-lg border p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <span className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">
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
