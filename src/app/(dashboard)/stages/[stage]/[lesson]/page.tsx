import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getLesson } from "@/lib/curriculum";
import { getProgress } from "@/lib/progress";
import { LessonStatusControls } from "@/components/lesson-status-controls";
import { TutorChat } from "@/components/tutor-chat";

type LessonPageProps = {
  params: Promise<{ stage: string; lesson: string }>;
};

export async function generateMetadata({ params }: LessonPageProps) {
  const { stage, lesson } = await params;
  const found = getLesson(stage, lesson);
  return {
    title: found
      ? `${found.lesson.title} — PilotPathway.ai`
      : "Lesson — PilotPathway.ai",
  };
}

export default async function LessonPage({ params }: LessonPageProps) {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const { stage: stageSlug, lesson: lessonSlug } = await params;
  const found = getLesson(stageSlug, lessonSlug);

  if (!found) {
    notFound();
  }

  const { stage, lesson } = found;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/stages/${stageSlug}/${lessonSlug}`);
  }

  const progress = await getProgress(user.id);
  const status = progress.get(lesson.slug) ?? "not_started";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Back to dashboard
      </Link>

      <span className="text-gold mt-8 block text-xs font-semibold tracking-[0.15em] uppercase">
        Stage {stage.number} · {stage.title}
      </span>
      <h1 className="mt-2 text-3xl font-semibold text-balance">
        {lesson.title}
      </h1>
      <p className="text-muted-foreground mt-3 text-pretty">{lesson.summary}</p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          What you will be able to do
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {lesson.objectives.map((objective) => (
            <li key={objective} className="flex gap-3 text-sm text-pretty">
              <span aria-hidden className="text-gold mt-px">
                ✓
              </span>
              <span>{objective}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-border bg-muted/40 mt-10 rounded-lg border p-5">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          Reference
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          <span className="text-foreground font-medium">Sources:</span>{" "}
          {lesson.sources.join(", ")}
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          <span className="text-foreground font-medium">ACS area:</span>{" "}
          {lesson.acsAreas.join(", ")}
        </p>
        <p className="text-muted-foreground mt-4 text-xs text-pretty">
          Always confirm specifics against the current FAA handbook and with
          your CFI. Regulations and handbook content change.
        </p>
      </section>

      <LessonStatusControls lessonSlug={lesson.slug} status={status} />

      <TutorChat
        stageSlug={stage.slug}
        lessonSlug={lesson.slug}
        starters={[
          `Quiz me on ${lesson.title.toLowerCase()}`,
          "Explain this like I've never flown before",
          lesson.objectives[0]
            ? `Help me with: ${lesson.objectives[0].toLowerCase()}`
            : "Where should I start?",
        ]}
      />
    </main>
  );
}
