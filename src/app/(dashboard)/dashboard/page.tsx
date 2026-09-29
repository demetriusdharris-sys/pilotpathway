import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getProgress, summarize, type ProgressBySlug } from "@/lib/progress";
import type { Stage } from "@/lib/curriculum";
import { loadCurriculum } from "@/lib/curriculum-store";
import { loadStaffOrganizations } from "@/lib/school-roster";
import { isReviewer } from "@/lib/practice/review";
import { isAdmin } from "@/lib/admin";
import { loadOwnPilotProfile } from "@/lib/pilots";
import { loadGuardianLinks } from "@/lib/guardian-links";
import { ADULT_AGE_YEARS, hasReachedAge } from "@/lib/date-of-birth";
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
        .select("date_of_birth, first_name")
        .eq("id", user.id)
        .maybeSingle(),
      loadCurriculum(supabase),
      loadMastery(supabase, user.id),
      loadAssessableObjectives(supabase),
    ]);

  // Staff get a way into their roster. A student is staff of nothing, so the
  // read comes back empty and no link appears. A failed read shows no link
  // rather than a link to a page that would not load.
  let isStaff = false;
  try {
    isStaff = (await loadStaffOrganizations(supabase, user.id)).length > 0;
  } catch (error) {
    console.error("Failed to check staff membership:", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Reviewers get a way in. Until now a CFI needed a URL somebody had emailed
  // them, and an account with nothing on screen to suggest they had access —
  // which is a poor welcome for the person the whole queue is waiting on.
  // isReviewer already fails soft to false, so a bad read shows no link.
  const [canReview, canAdminister] = await Promise.all([
    isReviewer(supabase),
    isAdmin(supabase),
  ]);

  // A pilot mentor gets a way back to their own profile. Being one is the
  // existence of the row, not a role — see 0033 and 0034. Fails soft to no link.
  let isPilot = false;
  try {
    isPilot = (await loadOwnPilotProfile(supabase, user.id)) !== null;
  } catch (error) {
    console.error("Failed to check for a pilot profile:", {
      userId: user.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // A pilot mentor who is not also studying has no business on a page of Stage 1
  // lessons. Conditional on having no progress, so anyone genuinely doing both
  // keeps their dashboard rather than losing it to a pilot profile.
  //
  // Never an administrator. /pilot carries no link to /admin, so bouncing an
  // admin who happens to have a pilot profile would lock them out of their own
  // admin page — which is exactly the account most likely to have one, since
  // testing the feature means making one.
  if (isPilot && !canAdminister && progress.size === 0) {
    redirect("/pilot");
  }

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

  // A student under 18 with nobody on file.
  //
  // This is a prompt and never a gate. The ground school is free to everyone
  // permanently and a minor is not locked out of learning while a parent gets
  // round to an email — that would fall hardest on exactly the students this
  // exists for. What a guardian unlocks is the things that need their say:
  // sharing progress with a school, and live sessions when those are built.
  //
  // It matters more now than it did: students arriving from a classroom visit
  // are school-age in bulk, so the guardian flow stops being an edge case and
  // becomes the common path. Burying it on the profile page would mean almost
  // nobody ever does it.
  const dateOfBirth =
    typeof profileResult.data?.date_of_birth === "string"
      ? profileResult.data.date_of_birth
      : null;

  const isMinor =
    dateOfBirth !== null && !hasReachedAge(dateOfBirth, ADULT_AGE_YEARS);

  const firstName =
    typeof profileResult.data?.first_name === "string"
      ? profileResult.data.first_name.trim()
      : "";

  let guardianState: "none" | "pending" | "verified" = "none";

  if (isMinor) {
    try {
      const links = await loadGuardianLinks(supabase, user.id);

      if (links.some((link) => link.status === "verified")) {
        guardianState = "verified";
      } else if (links.length > 0) {
        guardianState = "pending";
      }
    } catch (error) {
      // A failed read shows no prompt rather than nagging a student over our
      // own error. They can still reach it from the profile page.
      console.error("Could not read guardian links:", {
        userId: user.id,
        error: error instanceof Error ? error.message : String(error),
      });
      guardianState = "verified";
    }
  }

  // No stages means the curriculum could not be read. Fail loudly rather than
  // render an empty dashboard that looks like there is nothing to learn.
  if (stages.length === 0) {
    throw new Error("The curriculum could not be loaded.");
  }

  // Somebody who has touched nothing yet. The dashboard is sixteen identical
  // rows marked "Not started", which tells a sixteen-year-old neither where to
  // begin nor that there is an instructor inside — and the drop from "made an
  // account" to "asked the tutor something" is the number the activity panel
  // exists to watch.
  const hasStartedAnything = progress.size > 0;

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
            {isStaff ? (
              <Link
                href="/school"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Your students
              </Link>
            ) : null}
            {canReview ? (
              <Link
                href="/review/cards"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Review
              </Link>
            ) : null}
            {isStaff || isPilot ? (
              <Link
                href="/visits"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Classroom visits
              </Link>
            ) : null}
            {isPilot ? (
              <Link
                href="/pilot"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Your pilot profile
              </Link>
            ) : null}
            {canAdminister ? (
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Admin
              </Link>
            ) : null}
            <Link
              href="/practice"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Practice tests
            </Link>
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
        <h1 className="text-3xl font-semibold">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>

        {/* One banner at a time. A student with no date of birth is asked for
            that first, because the guardian question cannot even be asked
            without it. */}
        {!needsDateOfBirth && isMinor && guardianState !== "verified" ? (
          <section className="border-gold/40 bg-gold/10 mt-8 flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">
                {guardianState === "pending"
                  ? "Waiting on your parent or guardian"
                  : "Add a parent or guardian"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                {guardianState === "pending"
                  ? "We have emailed them. Until they confirm, a few things stay switched off — your lessons are not among them."
                  : "Because you are under 18, a parent or guardian confirms a few things on your behalf. It takes them one click. Your ground school stays open either way."}
              </p>
            </div>
            <Button
              asChild
              variant={guardianState === "pending" ? "outline" : "default"}
              className={
                guardianState === "pending"
                  ? "shrink-0"
                  : "bg-gold text-gold-foreground hover:bg-gold/90 shrink-0"
              }
            >
              <Link href="/profile">
                {guardianState === "pending" ? "Check on it" : "Ask them now"}
              </Link>
            </Button>
          </section>
        ) : null}

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

        {!hasStartedAnything && openStages[0]?.lessons[0] ? (
          <section className="border-border bg-card mt-8 rounded-lg border p-6">
            <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
              Start here
            </span>
            <h2 className="mt-1 text-xl font-semibold">
              {openStages[0].lessons[0].title}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              {openStages[0].lessons[0].summary}
            </p>
            <p className="mt-3 text-sm text-pretty">
              Every lesson has an instructor in it called Captain Path. Ask it
              anything — including the things you would feel stupid asking out
              loud. That is what it is for, and nobody else sees it.
            </p>
            <div className="mt-5">
              <Button
                asChild
                className="bg-gold text-gold-foreground hover:bg-gold/90"
              >
                <Link
                  href={`/stages/${openStages[0].slug}/${openStages[0].lessons[0].slug}`}
                >
                  Open the first lesson
                </Link>
              </Button>
            </div>
            <p className="text-muted-foreground mt-4 text-xs text-pretty">
              There is no order you have to follow and nothing to pay. Sixteen
              lessons in Stage 1, and you can stop and come back whenever.
            </p>
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
