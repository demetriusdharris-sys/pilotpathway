import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { isReviewer } from "@/lib/practice/review";
import {
  loadCardQueueByLesson,
  loadCardReviewCounts,
  loadCardReviewQueue,
} from "@/lib/card-review";
import { CardReviewCard } from "@/components/card-review-card";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Quiz card review — PilotPathway.ai",
};

const STATUSES = ["draft", "needs_changes", "approved", "retired"] as const;

const STATUS_LABEL: Record<string, string> = {
  draft: "Waiting",
  needs_changes: "Sent back",
  approved: "Approved",
  retired: "Cut",
};

export default async function CardReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; as?: string; lesson?: string }>;
}) {
  if (!getSupabaseEnv()) redirect("/login");

  const {
    status: requested,
    as: reviewerName,
    lesson,
  } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/review/cards");

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
          Reviewing quiz cards is for flight instructors and administrators. If
          you are a CFI and should have access, email
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
    throw new Error("Card review is unavailable right now.");
  }

  const status = STATUSES.includes(requested as (typeof STATUSES)[number])
    ? (requested as string)
    : "draft";

  const [cards, counts, byLesson] = await Promise.all([
    loadCardReviewQueue(admin, status, lesson),
    loadCardReviewCounts(admin),
    loadCardQueueByLesson(admin, status),
  ]);

  const keep = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, as: reviewerName, lesson, ...extra };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const query = params.toString();
    return `/review/cards${query ? `?${query}` : ""}`;
  };

  const reviewed = counts.approved + counts.retired;
  const total = reviewed + counts.draft + counts.needs_changes;

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
        <h1 className="mt-1 text-3xl font-semibold">Quiz card review</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          No student has seen any of these. A card appears on its lesson only
          once you approve it, and if we later change its wording it comes back
          here automatically — an approval covers the words you read, not the
          card&rsquo;s name.
        </p>

        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Reviewing practice test questions instead?{" "}
          <Link
            href="/review"
            className="text-foreground font-medium underline underline-offset-4"
          >
            They are on their own page
          </Link>
          .
        </p>

        {/* Identity is carried in the URL rather than stored: a reviewer may be
            a guest CFI on a borrowed account, and inventing a profile field for
            it would be a schema change to solve a form problem. */}
        <form className="border-border bg-card mt-6 rounded-lg border p-4">
          <label htmlFor="as" className="text-sm font-medium">
            Your name and certificate number
          </label>
          <p className="text-muted-foreground mt-1 text-xs text-pretty">
            This is written against every card you approve. It is what makes an
            approval a person rather than a click.
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
            {lesson ? (
              <input type="hidden" name="lesson" value={lesson} />
            ) : null}
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
              href={keep({ status: entry, lesson: undefined })}
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

        {total > 0 ? (
          <p className="text-muted-foreground mt-4 text-sm tabular-nums">
            {reviewed} of {total} cards decided.
          </p>
        ) : null}

        {/* 144 cards is nobody's single sitting. The lesson list is how a CFI
            picks up where they left off. */}
        {byLesson.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={keep({ lesson: undefined })}
              className={`rounded-md border px-2.5 py-1 text-xs ${
                lesson ? "border-border" : "border-gold-strong bg-gold/10"
              }`}
            >
              All lessons
            </Link>
            {byLesson.map((entry) => (
              <Link
                key={entry.lessonSlug}
                href={keep({ lesson: entry.lessonSlug })}
                className={`rounded-md border px-2.5 py-1 text-xs ${
                  lesson === entry.lessonSlug
                    ? "border-gold-strong bg-gold/10"
                    : "border-border"
                }`}
              >
                {entry.lessonTitle ?? entry.lessonSlug}{" "}
                <span className="text-muted-foreground tabular-nums">
                  {entry.count}
                </span>
              </Link>
            ))}
          </div>
        ) : null}

        {!reviewerName && (status === "draft" || status === "needs_changes") ? (
          <p className="border-gold/40 bg-gold/10 mt-6 rounded-md border p-4 text-sm text-pretty">
            Put your name in the box above before approving anything. The server
            refuses an approval without it.
          </p>
        ) : null}

        {cards.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm text-pretty">
            Nothing in this queue.
          </p>
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {cards.map((card) => (
              <CardReviewCard
                key={card.id}
                card={card}
                reviewer={reviewerName ?? ""}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
