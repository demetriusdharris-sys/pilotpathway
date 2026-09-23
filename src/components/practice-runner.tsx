"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  savePracticeAnswer,
  submitPracticeTest,
} from "@/app/(dashboard)/practice/actions";
import type { ActiveAttempt } from "@/lib/practice/attempts";
import type { AuthState } from "@/app/(auth)/actions";

/**
 * Sitting a practice test.
 *
 * Built for a phone on a bad connection, which drives three decisions:
 *
 *   - Every selection is sent the moment it is made, and the question carries
 *     a visible state — saving, saved, or not saved — so a student never has
 *     to guess whether their work survived.
 *   - A failed save is retried once automatically and then shown plainly. It
 *     is never swallowed, because a silently lost answer is a wrong score.
 *   - The whole paper is already on the page, so moving between questions
 *     needs no network at all. Only saving does.
 *
 * Refreshing reloads the same questions in the same order with the same
 * answers: the attempt was fixed in the database when it started.
 */

type SaveState = "idle" | "saving" | "saved" | "failed";

function SubmitButton({ unanswered }: { unanswered: number }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending
        ? "Submitting…"
        : unanswered > 0
          ? `Submit with ${unanswered} unanswered`
          : "Submit test"}
    </Button>
  );
}

function Timer({ startedAt, minutes }: { startedAt: string; minutes: number }) {
  const deadline = useMemo(
    () => Date.parse(startedAt) + minutes * 60 * 1000,
    [startedAt, minutes],
  );

  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, deadline - Date.now()),
  );

  useEffect(() => {
    const tick = setInterval(() => {
      setRemaining(Math.max(0, deadline - Date.now()));
    }, 1000);
    return () => clearInterval(tick);
  }, [deadline]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const low = remaining < 10 * 60 * 1000;

  return (
    <p
      className={`text-sm tabular-nums ${low ? "text-destructive font-semibold" : "text-muted-foreground"}`}
      // Announced every minute rather than every second, which would make a
      // screen reader unusable.
      aria-live={secs === 0 ? "polite" : "off"}
    >
      {remaining === 0
        ? "Time is up — submit when you are ready"
        : `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} left`}
    </p>
  );
}

function FigureNote({
  figureRef,
  figureSupplement,
}: {
  figureRef: string | null;
  figureSupplement: string | null;
}) {
  if (!figureRef) return null;

  return (
    <div className="border-border bg-muted/40 mt-4 rounded-md border p-3">
      <p className="text-sm font-medium">{figureRef}</p>
      <p className="text-muted-foreground mt-1 text-xs text-pretty">
        {figureSupplement
          ? `From the FAA Airman Knowledge Testing Supplement (${figureSupplement}), which is what you will be given on test day.`
          : "From the FAA Airman Knowledge Testing Supplement."}
      </p>
    </div>
  );
}

export function PracticeRunner({
  attempt,
  timedMinutes,
}: {
  attempt: ActiveAttempt;
  timedMinutes: number | null;
}) {
  const [index, setIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, number | null>>(
    () =>
      Object.fromEntries(
        attempt.questions.map((question) => [
          question.position,
          question.selectedPosition,
        ]),
      ),
  );
  const [saveStates, setSaveStates] = useState<Record<number, SaveState>>({});
  const shownAt = useRef<number>(Date.now());

  const [state, formAction] = useActionState<AuthState, FormData>(
    submitPracticeTest,
    {},
  );

  const question = attempt.questions[index];
  const answeredCount = Object.values(selections).filter(
    (value) => value !== null && value !== undefined,
  ).length;
  const unanswered = attempt.questions.length - answeredCount;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const choose = useCallback(
    async (questionPosition: number, choicePosition: number) => {
      setSelections((current) => ({
        ...current,
        [questionPosition]: choicePosition,
      }));
      setSaveStates((current) => ({
        ...current,
        [questionPosition]: "saving",
      }));

      const secondsSpent = Math.round((Date.now() - shownAt.current) / 1000);

      const attemptSave = async () =>
        savePracticeAnswer({
          attemptId: attempt.id,
          questionPosition,
          choicePosition,
          secondsSpent,
        });

      let result = await attemptSave();

      // One silent retry: on a phone, the common failure is a single request
      // dying as the connection flaps, not the server refusing.
      if (!result.saved) {
        result = await attemptSave();
      }

      setSaveStates((current) => ({
        ...current,
        [questionPosition]: result.saved ? "saved" : "failed",
      }));
    },
    [attempt.id],
  );

  if (!question) {
    return null;
  }

  const saveState = saveStates[question.position] ?? "idle";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Question {question.position} of {attempt.questions.length} ·{" "}
          {answeredCount} answered
        </p>
        {timedMinutes ? (
          <Timer startedAt={attempt.startedAt} minutes={timedMinutes} />
        ) : null}
      </div>

      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={attempt.questions.length}
        aria-label="Questions answered"
      >
        <div
          className="bg-gold h-full rounded-full transition-[width]"
          style={{
            width: `${(answeredCount / attempt.questions.length) * 100}%`,
          }}
        />
      </div>

      <fieldset className="border-border bg-card rounded-lg border p-5">
        <legend className="sr-only">Question {question.position}</legend>
        <p className="text-pretty">{question.stem}</p>

        <FigureNote
          figureRef={question.figureRef}
          figureSupplement={question.figureSupplement}
        />

        <div className="mt-5 flex flex-col gap-2">
          {question.choices.map((choice) => {
            const chosen = selections[question.position] === choice.position;

            return (
              <button
                key={choice.position}
                type="button"
                onClick={() => choose(question.position, choice.position)}
                aria-pressed={chosen}
                className={`border-border focus-visible:ring-ring flex items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none ${
                  chosen ? "border-gold-strong bg-gold/10" : "hover:bg-accent"
                }`}
              >
                <span className="text-muted-foreground font-semibold">
                  {["1", "2", "3"][choice.position - 1]}
                </span>
                <span className="text-pretty">{choice.text}</span>
              </button>
            );
          })}
        </div>

        <p
          className="text-muted-foreground mt-3 text-xs"
          role={saveState === "failed" ? "alert" : undefined}
        >
          {saveState === "saving"
            ? "Saving…"
            : saveState === "saved"
              ? "Saved"
              : saveState === "failed"
                ? "That answer did not save — tap it again when you have signal. Everything else is safe."
                : " "}
        </p>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setIndex((i) => Math.min(attempt.questions.length - 1, i + 1))
          }
          disabled={index === attempt.questions.length - 1}
        >
          Next
        </Button>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <form action={formAction} className="border-border border-t pt-5">
        <input type="hidden" name="attemptId" value={attempt.id} />
        <p className="text-muted-foreground mb-3 text-sm text-pretty">
          Nothing is marked until you submit. You can go back through your
          answers first — unanswered questions count as wrong, the same as on
          the real test.
        </p>
        <SubmitButton unanswered={unanswered} />
      </form>
    </div>
  );
}
