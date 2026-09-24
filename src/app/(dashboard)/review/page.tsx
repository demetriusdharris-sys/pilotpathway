import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  isReviewer,
  loadReviewCounts,
  loadReviewQueue,
} from "@/lib/practice/review";
import { getBankHealth } from "@/lib/practice/assemble";
import { QuestionReviewCard } from "@/components/question-review-card";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Question review — PilotPathway.ai",
};

const STATUSES = ["draft", "needs_changes", "cfi_approved", "retired"] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Waiting",
  needs_changes: "Sent back",
  cfi_approved: "Approved",
  retired: "Cut",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; as?: string }>;
}) {
  if (!getSupabaseEnv()) redirect("/login");

  const { status: requested, as: reviewerName } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/review");

  // Asked of the database, not inferred from anything the page knows. The
  // action asks again before it writes.
  const allowed = await isReviewer(supabase);

  if (!allowed) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">
          Nothing here for this account
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Reviewing practice questions is for flight instructors and
          administrators. If you are a CFI and should have access, email
          demetrius@pilotpathway.ai.
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
    throw new Error("Question review is unavailable right now.");
  }

  const status = STATUSES.includes(requested as (typeof STATUSES)[number])
    ? (requested as string)
    : "draft";

  const [questions, counts, health] = await Promise.all([
    loadReviewQueue(admin, status),
    loadReviewCounts(admin),
    getBankHealth(supabase),
  ]);

  const thinnest = health.filter((entry) => entry.slots > 0).slice(0, 3);

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
          For flight instructors
        </span>
        <h1 className="mt-1 text-3xl font-semibold">Question review</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          Nothing here has been seen by a student. A question is served only
          once you approve it, and any later edit to its wording sends it back
          to this queue automatically.
        </p>

        {/* Identity is carried in the URL rather than stored: a reviewer may be
            a guest CFI on a borrowed account, and inventing a profile field for
            it would be a schema change to solve a form problem. */}
        <form className="border-border bg-card mt-6 rounded-lg border p-4">
          <label htmlFor="as" className="text-sm font-medium">
            Your name and certificate number
          </label>
          <p className="text-muted-foreground mt-1 text-xs text-pretty">
            This is written against every question you approve. It is what makes
            an approval a person rather than a click.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              id="as"
              name="as"
              defaultValue={reviewerName ?? ""}
              placeholder="Jane Doe, CFI 1234567"
              className="border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className="border-border rounded-md border px-3 py-2 text-sm font-medium"
            >
              Set
            </button>
          </div>
        </form>

        <nav className="mt-6 flex flex-wrap gap-2">
          {STATUSES.map((entry) => (
            <Link
              key={entry}
              href={`/review?status=${entry}${reviewerName ? `&as=${encodeURIComponent(reviewerName)}` : ""}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                entry === status
                  ? "border-gold-strong bg-gold/10 font-medium"
                  : "border-border"
              }`}
            >
              {STATUS_LABEL[entry]}{" "}
              <span className="text-muted-foreground tabular-nums">
                {counts[entry]}
              </span>
            </Link>
          ))}
        </nav>

        {thinnest.length > 0 ? (
          <p className="text-muted-foreground mt-4 text-xs text-pretty">
            Thinnest areas by approved questions per slot:{" "}
            {thinnest
              .map(
                (entry) => `${entry.area} (${entry.approved}/${entry.slots})`,
              )
              .join(", ")}
            .
          </p>
        ) : null}

        {!reviewerName && status === "draft" ? (
          <p className="border-gold/40 bg-gold/10 mt-6 rounded-md border p-4 text-sm text-pretty">
            Put your name in the box above before approving anything. The server
            refuses an approval without it.
          </p>
        ) : null}

        {questions.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm text-pretty">
            Nothing in this queue.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {questions.map((question) => (
              <QuestionReviewCard
                key={question.id}
                question={question}
                reviewer={reviewerName ?? ""}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
