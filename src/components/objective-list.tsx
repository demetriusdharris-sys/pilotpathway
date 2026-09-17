import type { LearningObjective } from "@/lib/curriculum";
import {
  masterySummary,
  objectiveState,
  type MasteryByObjective,
} from "@/lib/objective-mastery";

type ObjectiveListProps = {
  objectives: LearningObjective[];
  mastery: MasteryByObjective;
  /** Objectives with at least one approved quiz card. */
  assessable: Set<string>;
};

/**
 * What a student will be able to do, and what they have shown so far.
 *
 * Three states, and the difference between the last two is deliberate:
 *
 *   - Shown — answered correctly enough times, in the quiz, to count.
 *   - Not shown yet — there is a quiz for this and they have not passed it.
 *   - No mark at all — there is no approved quiz card for this objective, so
 *     we have never asked. Telling a student they have not shown something we
 *     never put in front of them would be our failure reported as theirs.
 *
 * Only quiz evidence appears here. The tutor's read of a conversation steers
 * the tutor and is never shown as progress.
 */
export function ObjectiveList({
  objectives,
  mastery,
  assessable,
}: ObjectiveListProps) {
  const summary = masterySummary(
    objectives.map((objective) => objective.id),
    assessable,
    mastery,
  );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          What you will be able to do
        </h2>
        {summary.available > 0 ? (
          <p className="text-muted-foreground text-sm">
            {summary.shown} of {summary.available} shown
          </p>
        ) : null}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {objectives.map((objective) => {
          const state = objectiveState(objective.id, mastery);
          const hasQuiz = assessable.has(objective.id);

          return (
            <li key={objective.id} className="flex gap-3 text-sm text-pretty">
              <span
                aria-hidden
                className={
                  state === "mastered"
                    ? "text-gold-strong mt-px"
                    : "text-muted-foreground mt-px"
                }
              >
                ✓
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span>{objective.text}</span>

                {state === "mastered" ? (
                  <span className="text-gold-strong shrink-0 text-xs font-semibold tracking-[0.08em] uppercase">
                    Shown
                  </span>
                ) : hasQuiz ? (
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {state === "in_progress" ? "Keep going" : "Not shown yet"}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {summary.available > 0 ? (
        <p className="text-muted-foreground mt-4 text-xs text-pretty">
          &quot;Shown&quot; means you answered the quiz for that objective
          correctly, three times, with no recent miss. Talking it through with
          Captain Path is how you get there; the quiz is what records it.
        </p>
      ) : null}
    </section>
  );
}
