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
import { ReportTriage } from "@/components/report-triage";
import { ReviewerAccessForm } from "@/components/reviewer-access-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Admin — PilotPathway.ai",
};

const ROLE_LABEL: Record<string, string> = {
  mentor: "Reviewer",
  admin: "Administrator",
  school_admin: "School administrator",
};

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

  const [staff, health, questionCounts, cardCounts, reports, reportCounts] =
    await Promise.all([
      loadStaffAccounts(admin),
      getBankHealth(supabase),
      loadReviewCounts(admin),
      loadCardReviewCounts(admin),
      loadReports(admin, "new"),
      countReportsByStatus(admin),
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
            questions. Nothing reaches a student until one of them does.
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
                    {ROLE_LABEL[account.role] ?? account.role}
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
