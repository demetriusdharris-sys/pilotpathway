import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadLesson } from "@/lib/curriculum-store";
import { getProgress } from "@/lib/progress";
import { loadConversation } from "@/lib/instructor-messages";
import { loadApprovedCards } from "@/lib/quiz-cards";
import { MAX_HISTORY_MESSAGES } from "@/lib/tutor";
import { LessonStatusControls } from "@/components/lesson-status-controls";
import { QuizCards } from "@/components/quiz-cards";
import { tutorStarters } from "@/lib/tutor-starters";
import { TutorChat } from "@/components/tutor-chat";

type LessonPageProps = {
  params: Promise<{ stage: string; lesson: string }>;
};

export async function generateMetadata({ params }: LessonPageProps) {
  const { stage, lesson } = await params;
  const fallback = { title: "Lesson — PilotPathway.ai" };

  if (!getSupabaseEnv()) {
    return fallback;
  }

  // A tab title is not worth an error page: if the lesson cannot be read here,
  // the page itself will report the real problem.
  try {
    const supabase = await createClient();
    const found = await loadLesson(supabase, stage, lesson);
    return found ? { title: `${found.lesson.title} — PilotPathway.ai` } : fallback;
  } catch {
    return fallback;
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const { stage: stageSlug, lesson: lessonSlug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/stages/${stageSlug}/${lessonSlug}`);
  }

  // After sign-in, not before: lessons are readable only by signed-in users, so
  // looking one up first would turn "please log in" into "lesson not found".
  const found = await loadLesson(supabase, stageSlug, lessonSlug);

  if (!found) {
    notFound();
  }

  const { stage, lesson } = found;

  const progress = await getProgress(user.id);
  const status = progress.get(lesson.slug) ?? "not_started";

  // Prior conversation, so a refresh no longer destroys the thread. Approved
  // cards load alongside it -- both are independent reads.
  const [history, cards] = await Promise.all([
    loadConversation(supabase, user.id, lesson.slug, MAX_HISTORY_MESSAGES),
    loadApprovedCards(supabase, lesson.slug),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground text-sm"
      >
        ← Back to dashboard
      </Link>

      <span className="text-gold-strong mt-8 block text-xs font-semibold tracking-[0.15em] uppercase">
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
            <li key={objective.id} className="flex gap-3 text-sm text-pretty">
              <span aria-hidden className="text-gold mt-px">
                ✓
              </span>
              <span>{objective.text}</span>
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
          {lesson.acsAreas.join(", ")} — {lesson.topic}
        </p>
        <p className="text-muted-foreground mt-4 text-xs text-pretty">
          AI ground instructor. Not an endorsement. Always confirm regulations
          against the current FAA publications and with your CFI. Regulations
          and handbook content change.
        </p>
      </section>

      {/* Renders nothing until a CFI has approved cards for this lesson. */}
      <QuizCards cards={cards} />

      <LessonStatusControls lessonSlug={lesson.slug} status={status} />

      <TutorChat
        stageSlug={stage.slug}
        lessonSlug={lesson.slug}
        initialMessages={history.map((m) => ({
          role: m.role,
          content: m.content,
        }))}
        starters={tutorStarters(lesson)}
      />
    </main>
  );
}
