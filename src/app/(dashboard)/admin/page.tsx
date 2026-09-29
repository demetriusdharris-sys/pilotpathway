import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isAdmin, loadStaffAccounts } from "@/lib/admin";
import { getBankHealth } from "@/lib/practice/assemble";
import { loadReviewCounts } from "@/lib/practice/review";
import { loadCardReviewCounts } from "@/lib/card-review";
import { countReportsByStatus, loadReports } from "@/lib/content-reports";
import { loadActivity } from "@/lib/activity";
import { loadAllPilots } from "@/lib/pilots";
import { PilotVettingForm } from "@/components/pilot-vetting-form";
import { ReportTriage } from "@/components/report-triage";
import { ReviewerAccessForm } from "@/components/reviewer-access-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Admin — PilotPathway.ai",
};

/** What this account can do, rather than what it is called. */
function capabilities(account: { role: string; mayReview: boolean }): string {
  const held: string[] = [];
  if (account.role === "admin") held.push("Administrator");
  if (account.role === "school_admin") held.push("School administrator");
  if (account.mayReview) held.push("Reviewer");
  // An admin reviews regardless, so say so rather than leaving it implied.
  if (held.length === 1 && held[0] === "Administrator") {
    return "Administrator · reviews by default";
  }
  return held.join(" · ") || account.role;
}

export default async function AdminPage() {
  if (!getSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");

  const allowed = await isAdmin(supabase);

  if (!allowed) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">
          Nothing here for this account
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          This page is for administrators.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block font-medium underline underline-offset-4"
        >
          Back to the dashboard
        </Link>
      </main>
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    throw new Error("The admin page is unavailable right now.");
  }

  const [
    staff,
    health,
    questionCounts,
    cardCounts,
    reports,
    reportCounts,
    activity,
    pilots,
  ] = await Promise.all([
    loadStaffAccounts(admin),
    getBankHealth(supabase),
    loadReviewCounts(admin),
    loadCardReviewCounts(admin),
    loadReports(admin, "new"),
    countReportsByStatus(admin),
    loadActivity(admin),
    loadAllPilots(admin),
  ]);

  const thin = health.filter((entry) => entry.approved < entry.slots);
  const totalApproved = health.reduce((sum, entry) => sum + entry.approved, 0);

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
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          The operational things that used to need a hand-written SQL statement.
        </p>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Reviewer access</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            A reviewer is a CFI who can approve quiz cards and practice
            questions. Nothing reaches a student until one of them does. This is
            a capability rather than a role, so the same person can also be a
            pilot mentor later.
          </p>
          <ReviewerAccessForm />
          <p className="text-muted-foreground mt-4 text-xs text-pretty">
            This page sets reviewer access and nothing else. It cannot create an
            administrator, change an administrator, or change your own role —
            those stay hand-written statements, where they are visible. Every
            change made here is recorded permanently.
          </p>
        </section>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">
            Pilot mentors{" "}
            {pilots.filter((p) => p.profile.vettingStatus !== "verified")
              .length > 0 ? (
              <span className="text-gold-strong tabular-nums">
                {
                  pilots.filter((p) => p.profile.vettingStatus !== "verified")
                    .length
                }
              </span>
            ) : null}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            A school only ever sees a pilot marked cleared. The background check
            itself is never stored here — what is recorded is that a named
            person confirmed one was done, and when it is due again.
          </p>

          {pilots.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm text-pretty">
              Nobody has made a pilot profile yet. Send a pilot to{" "}
              <code>/pilot</code> and they can fill one in.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {pilots.map((entry) => (
                <PilotVettingForm
                  key={entry.profile.userId}
                  profile={entry.profile}
                  email={entry.email}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Who has access</h2>
          {staff.length === 0 ? (
            <p className="text-muted-foreground mt-2 text-sm">
              Nobody but you.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {staff.map((account) => (
                <li
                  key={account.userId}
                  className="border-border flex flex-wrap items-baseline justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {account.email ?? account.displayName ?? account.userId}
                    {account.reviewerCredential ? (
                      <span className="text-muted-foreground">
                        {" "}
                        — {account.reviewerCredential}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {capabilities(account)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground mt-3 text-xs text-pretty">
            Students are not listed. Nothing here needs a directory of their
            email addresses, and most of them are minors.
          </p>
        </section>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-8 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">What has been happening</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Counts and totals only — there is no per-student breakdown here, and
            there should not be one.
          </p>

          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {[activity.week, activity.month].map((window) => (
              <div key={window.days}>
                <p className="text-xs font-semibold tracking-[0.08em] uppercase">
                  Last {window.days} days
                </p>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <Stat
                    label="Students who asked something"
                    value={window.activeStudents}
                  />
                  <Stat label="Tutor messages" value={window.tutorMessages} />
                  <Stat label="New accounts" value={window.signups} />
                  <Stat label="Quiz answers" value={window.quizAnswers} />
                  <Stat
                    label="Practice tests started"
                    value={window.practiceAttempts}
                  />
                  <Stat
                    label="Tutor spend"
                    value={`$${(window.spendCents / 100).toFixed(2)}`}
                  />
                </dl>
              </div>
            ))}
          </div>

          <div className="border-border mt-6 border-t pt-4">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase">
              How far people get
            </p>
            <p className="text-muted-foreground mt-1 text-xs text-pretty">
              Each step is a subset of the one above it. Where the numbers drop
              is where to look.
            </p>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <Stat label="Accounts" value={activity.funnel.accounts} />
              <Stat
                label="Asked the tutor something"
                value={activity.funnel.started}
              />
              <Stat
                label="Marked a lesson complete"
                value={activity.funnel.completedALesson}
              />
              <Stat
                label="Answered a quiz"
                value={activity.funnel.answeredAQuiz}
              />
              <Stat
                label="Showed an objective"
                value={activity.funnel.showedAnObjective}
              />
            </dl>
          </div>

          <div className="border-border mt-6 border-t pt-4">
            <p className="text-xs font-semibold tracking-[0.08em] uppercase">
              Cost and caps
            </p>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <Stat
                label="Tutor spend, all time"
                value={`$${(activity.allTimeSpendCents / 100).toFixed(2)}`}
              />
              <Stat
                label="Busiest day so far"
                value={
                  activity.busiestDay
                    ? `${activity.busiestDay.messages} messages on ${activity.busiestDay.day}`
                    : "no messages yet"
                }
              />
              <Stat
                label="Cap per student per day"
                value={activity.limits.dailyPerUser ?? "not set"}
              />
              <Stat
                label="Cap across everyone per day"
                value={activity.limits.globalDaily ?? "not set"}
              />
            </dl>
            <p className="text-muted-foreground mt-2 text-xs text-pretty">
              Both caps live in <code>usage_limits</code> and change with no
              deploy. Errors are not here — those are in the Vercel runtime
              logs, and a student quoting a reference code from an error page is
              what makes one findable.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        {/* Reports first when there are any. A student took the trouble to tell
            us something is wrong, and a wrong fact in front of a learner
            outranks every other thing on this page. */}
        <section className="border-border bg-card mt-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">
            Reported problems{" "}
            {reportCounts.new > 0 ? (
              <span className="text-gold-strong tabular-nums">
                {reportCounts.new}
              </span>
            ) : null}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Students saying a card, a question or a tutor reply looks wrong. A
            report never changes the content itself — you decide what reaches
            the reviewer, in the review queue.
          </p>

          {reports.length === 0 ? (
            <p className="text-muted-foreground mt-3 text-sm">
              Nothing new.{" "}
              {reportCounts.actioned + reportCounts.dismissed > 0
                ? `${reportCounts.actioned} handled, ${reportCounts.dismissed} needed no change.`
                : ""}
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {reports.map((report) => (
                <ReportTriage key={report.id} report={report} />
              ))}
            </ul>
          )}
        </section>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Review queues</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Quiz cards</p>
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                {cardCounts.draft} waiting · {cardCounts.needs_changes} sent
                back · {cardCounts.approved} approved · {cardCounts.retired} cut
              </p>
              <Link
                href="/review/cards"
                className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
              >
                Open the card queue
              </Link>
            </div>
            <div>
              <p className="text-sm font-medium">Practice questions</p>
              <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                {questionCounts.draft} waiting · {questionCounts.needs_changes}{" "}
                sent back · {questionCounts.cfi_approved} approved ·{" "}
                {questionCounts.retired} cut
              </p>
              <Link
                href="/review"
                className="mt-2 inline-block text-sm font-medium underline underline-offset-4"
              >
                Open the question queue
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ */}
        <section className="border-border bg-card mt-4 rounded-lg border p-6">
          <h2 className="text-xl font-semibold">Question bank health</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            Approved questions per area, against what one full test needs.{" "}
            {totalApproved} approved in total. An area below its slot count
            cannot be filled, and a whole test is refused until every area can
            be.
          </p>

          <ul className="mt-4 flex flex-col gap-1">
            {health.map((entry) => (
              <li
                key={entry.area}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-pretty">{entry.area}</span>
                <span
                  className={`tabular-nums ${
                    entry.approved >= entry.slots
                      ? "text-muted-foreground"
                      : "text-gold-strong font-medium"
                  }`}
                >
                  {entry.approved} / {entry.slots}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground mt-4 text-xs text-pretty">
            {thin.length === 0
              ? "Every area can be filled. A full test is available."
              : `${thin.length} of ${health.length} areas cannot be filled yet. Three times the slot count is the target for a usable release — that is what stops a second test repeating the first.`}
          </p>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            This is never shown to a student. A learner does not need to know
            the weather section is thin.
          </p>
        </section>
      </div>
    </main>
  );
}

/** One label and one number. Local to this page; nothing else needs it. */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
