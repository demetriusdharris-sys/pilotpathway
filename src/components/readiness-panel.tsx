import Link from "next/link";
import {
  AREA_PASS_PERCENT,
  MINIMUM_ANSWERS_PER_AREA,
  readinessHeadline,
  type ReadinessReport,
} from "@/lib/practice/readiness";

/**
 * What we are willing to tell a student about being ready.
 *
 * The number and the recommendation are shown together, always, because a
 * score on its own is the thing a student screenshots and acts on. Where there
 * is not enough evidence, there is no number at all — "not enough data yet" in
 * words, exactly as it sounds, rather than a percentage with a disclaimer
 * underneath it that nobody reads.
 */
export function ReadinessPanel({
  report,
  lessonLinks,
}: {
  report: ReadinessReport;
  /** lesson slug → the stage it lives in, for building a link. */
  lessonLinks?: Record<string, string>;
}) {
  const headline = readinessHeadline(report);
  const blocked = report.recommendation === "keep_practising";
  const unknown = report.recommendation === "not_enough_data";

  return (
    <section
      className={`mt-8 rounded-lg border p-6 ${
        unknown
          ? "border-border bg-card"
          : blocked
            ? "border-gold/40 bg-gold/10"
            : "border-border bg-card"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          Knowledge test readiness
        </span>
        {report.score !== null ? (
          <span className="text-2xl font-semibold tabular-nums">
            {report.score}%
          </span>
        ) : null}
      </div>

      <h2 className="mt-1 text-xl font-semibold">{headline.title}</h2>
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        {headline.detail}
      </p>

      {report.score !== null ? (
        <p className="text-muted-foreground mt-2 text-xs text-pretty">
          Confidence: {report.confidence}. This is your practice history across
          every test, weighted so recent answers count for more — not your last
          score.
        </p>
      ) : null}

      {report.blockingAreas.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Below {AREA_PASS_PERCENT}%</h3>
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {report.blockingAreas.map((area) => (
              <li key={area.area} className="flex justify-between gap-4">
                <span className="text-pretty">{area.area}</span>
                <span className="shrink-0 tabular-nums">{area.percent}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {report.weakCodes.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">What to work on</h3>
          <ul className="mt-2 flex flex-col gap-2 text-sm">
            {report.weakCodes.slice(0, 5).map((code) => {
              const stage = code.lessonSlug
                ? lessonLinks?.[code.lessonSlug]
                : undefined;

              return (
                <li key={code.acsCode} className="flex flex-col gap-1">
                  <span className="text-pretty">
                    {code.knowledgeArea}{" "}
                    <span className="text-muted-foreground tabular-nums">
                      · {code.percent}% of {code.answered} answered
                    </span>
                  </span>
                  {stage && code.lessonSlug ? (
                    <Link
                      href={`/stages/${stage}/${code.lessonSlug}`}
                      className="text-foreground w-fit font-medium underline underline-offset-4"
                    >
                      Go to the lesson and ask Captain Path
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {report.areasNeedingData.length > 0 ? (
        <p className="text-muted-foreground mt-5 text-xs text-pretty">
          Still need {MINIMUM_ANSWERS_PER_AREA} answered questions each:{" "}
          {report.areasNeedingData.join(", ")}.
        </p>
      ) : null}
    </section>
  );
}
