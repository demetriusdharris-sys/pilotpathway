import { MIN_COHORT, type VisitOutcomes } from "@/lib/visit-outcomes";

/**
 * What came of a visit, for the school that hosted it and the pilot who took it.
 *
 * THE THREE FIGURES ARE LABELLED BY HOW THEY WERE OBTAINED, not arranged by
 * size, because they are not the same kind of fact and a sponsor will quote
 * whichever is largest. "Unverified data in a sponsor report is a trust event
 * you don't recover from" — so the self-reported figure says so on its face,
 * and the scored one is marked as the one that was marked.
 *
 * NO NAMES, EVER. Not a list, not a link to one, not an "n students" that
 * becomes clickable later. The students behind these counts typed a code; they
 * did not agree to be shown to their school or to a funder.
 */
export function VisitOutcomesPanel({
  outcomes,
  audience,
}: {
  outcomes: VisitOutcomes;
  audience: "pilot" | "school";
}) {
  if (outcomes.signups === 0) {
    return (
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        Nobody has used the code yet. It keeps working — a student who writes it
        down and signs up next week is still counted to this visit.
      </p>
    );
  }

  return (
    <>
      <dl className="mt-3 grid gap-4 sm:grid-cols-2">
        <Figure
          label="Signed up after the visit"
          value={outcomes.signups}
          note="Typed the code from the room."
        />

        {outcomes.tooFewToReport ? null : (
          <>
            <Figure
              label="Asked the instructor something"
              value={outcomes.started ?? 0}
              note="Observed — a question they typed."
            />
            <Figure
              label={
                outcomes.firstStageTitle
                  ? `Marked ${outcomes.firstStageTitle} finished`
                  : "Marked the first stage finished"
              }
              value={outcomes.markedFirstStageComplete ?? 0}
              note="Self-reported. Students tick their own lessons."
            />
            <Figure
              label="Shown an objective on a quiz"
              value={outcomes.shownAnObjective ?? 0}
              note="Scored. The only figure here that was marked."
            />
          </>
        )}
      </dl>

      {outcomes.tooFewToReport ? (
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Learning figures appear once {MIN_COHORT} students from a visit have
          signed up. Below that a percentage is really a statement about one
          person, and whoever was in the room could usually name them.
        </p>
      ) : null}

      {!outcomes.tooFewToReport && outcomes.shownAnObjective === 0 ? (
        <p className="border-gold/40 bg-gold/10 mt-4 rounded-md border p-4 text-sm text-pretty">
          <span className="font-medium">
            Nothing has been scored yet, and that is on us rather than on these
            students.
          </span>{" "}
          A quiz only appears on a lesson once a flight instructor has approved
          the questions, and that review is still in progress. Until it is done
          this row stays at zero however much work they do — which is why it is
          the figure to watch rather than the one above it.
        </p>
      ) : null}

      <p className="text-muted-foreground mt-3 text-xs text-pretty">
        Counts only. {audience === "school" ? "Signing up" : "A student typing your code"}{" "}
        attributes a student to this visit and nothing more — it does not enrol
        them, and it gives nobody a view of their work.
      </p>
    </>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
      <p className="text-muted-foreground mt-0.5 text-xs text-pretty">{note}</p>
    </div>
  );
}
