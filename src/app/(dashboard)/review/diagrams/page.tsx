import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isReviewer, loadReviewerCredential } from "@/lib/practice/review";
import { loadDiagramCounts, loadDiagramQueue } from "@/lib/diagrams/review";
import { DiagramReviewCard } from "@/components/diagram-review-card";
import { setReviewerName } from "../actions";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Diagram review — PilotPathway.ai",
};

const STATUSES = ["draft", "needs_changes", "approved", "retired"] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Waiting",
  needs_changes: "Sent back",
  approved: "Approved",
  retired: "Cut",
};

export default async function DiagramReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!getSupabaseEnv()) redirect("/login");

  const { status: requested } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/review/diagrams");

  const allowed = await isReviewer(supabase);

  if (!allowed) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">
          Nothing here for this account
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Reviewing diagrams is for flight instructors and administrators.
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

  const status = STATUSES.includes(requested as (typeof STATUSES)[number])
    ? (requested as string)
    : "draft";

  const [diagrams, counts, reviewerName] = await Promise.all([
    loadDiagramQueue(supabase, status),
    loadDiagramCounts(supabase),
    loadReviewerCredential(supabase, user.id),
  ]);

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
              href="/review/cards"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Cards
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          For flight instructors
        </span>
        <h1 className="mt-1 text-3xl font-semibold">Diagram review</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          Each one is drawn exactly as a student will see it, so judge the
          picture rather than the description. A diagram appears on its lesson
          only once you approve it, and changing its wording sends it back here.
        </p>

        <form
          action={setReviewerName}
          className="border-border bg-card mt-6 rounded-lg border p-4"
        >
          <label htmlFor="credential" className="text-sm font-medium">
            Your name and certificate number
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              id="credential"
              name="credential"
              defaultValue={reviewerName ?? ""}
              placeholder="Jane Doe, CFI 1234567"
              className="border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
            <button
              type="submit"
              className="border-border rounded-md border px-3 py-2 text-sm font-medium"
            >
              Save
            </button>
          </div>
        </form>

        <nav className="mt-6 flex flex-wrap gap-2">
          {STATUSES.map((entry) => (
            <Link
              key={entry}
              href={`/review/diagrams?status=${entry}`}
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

        {diagrams.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm text-pretty">
            Nothing in this queue.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {diagrams.map((diagram) => (
              <DiagramReviewCard
                key={diagram.key}
                diagram={diagram}
                reviewer={reviewerName ?? ""}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
