"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { reviewQuestion } from "@/app/(dashboard)/review/actions";
import type { ReviewableQuestion } from "@/lib/practice/review";
import type { AuthState } from "@/app/(auth)/actions";

function DecisionButton({
  decision,
  label,
  variant,
  disabled,
}: {
  decision: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="sm"
      variant={variant}
      disabled={pending || disabled}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * One question, everything a reviewer needs to judge it, and three decisions.
 *
 * The answer and the explanation are here because a reviewer cannot check a
 * question without them — this page is rendered on the server with the service
 * role for exactly that reason, and those columns are granted to nobody in the
 * browser.
 *
 * There is no edit box, on purpose. The markdown in docs/questions is the
 * source and the next sync overwrites the row, so a correction typed here
 * would quietly disappear. "Needs changes" with a note is how a reviewer gets
 * a fix made in the place that lasts.
 */
export function QuestionReviewCard({
  question,
  reviewer,
}: {
  question: ReviewableQuestion;
  reviewer: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    reviewQuestion,
    {},
  );
  const [note, setNote] = useState("");

  return (
    <li className="border-border bg-card rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {question.acsCode}
          {question.sourceKey ? ` · ${question.sourceKey}` : ""}
        </span>
        <span className="text-muted-foreground text-xs">
          {question.knowledgeArea} · difficulty {question.difficulty}
        </span>
      </div>

      {question.hasValueGap ? (
        <p className="border-gold/40 bg-gold/10 mt-3 rounded-md border p-3 text-sm text-pretty">
          This question still has a <code>[CFI: confirm value]</code> gap. It
          cannot be approved until the value is filled in the source document —
          tell us what it should be and we will change it there.
        </p>
      ) : null}

      {question.reviewNote ? (
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          <span className="text-foreground font-medium">Last sent back:</span>{" "}
          {question.reviewNote}
        </p>
      ) : null}

      <p className="mt-3 text-pretty">{question.stem}</p>

      {question.figureRef ? (
        <p className="text-muted-foreground mt-2 text-xs">
          {question.figureRef}
          {question.figureSupplement ? ` · ${question.figureSupplement}` : ""}
        </p>
      ) : null}

      <ul className="mt-3 flex flex-col gap-1">
        {question.choices.map((choice) => (
          <li
            key={choice.letter}
            className={`rounded-md px-3 py-2 text-sm ${
              choice.isCorrect ? "bg-gold/10 font-medium" : ""
            }`}
          >
            <span className="text-muted-foreground mr-2 font-semibold">
              {choice.letter}
            </span>
            {choice.text}
            {choice.isCorrect ? (
              <span className="text-gold-strong ml-2 text-xs font-semibold tracking-[0.08em] uppercase">
                correct
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        <span className="text-foreground font-medium">Explanation:</span>{" "}
        {question.explanation}
      </p>

      <p className="text-muted-foreground mt-2 text-xs text-pretty">
        <span className="text-foreground font-medium">Written from:</span>{" "}
        {question.sourceNote ?? "not recorded"}
        {question.authoredBy ? ` · by ${question.authoredBy}` : ""}
      </p>

      {question.reviewedBy ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Approved by {question.reviewedBy}
          {question.reviewedAt ? ` on ${question.reviewedAt.slice(0, 10)}` : ""}
        </p>
      ) : null}

      <form action={formAction} className="border-border mt-4 border-t pt-4">
        <input type="hidden" name="questionId" value={question.id} />
        <input type="hidden" name="reviewer" value={reviewer} />

        <Label htmlFor={`note-${question.id}`} className="text-sm">
          What needs changing? (required to send back)
        </Label>
        <textarea
          id={`note-${question.id}`}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          placeholder="e.g. the second choice is defensible in a high-wing trainer"
        />

        {state.error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive mt-3 rounded-md border px-3 py-2 text-sm text-pretty"
          >
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p className="text-muted-foreground mt-3 text-sm">{state.message}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <DecisionButton
            decision="approve"
            label="Approve"
            disabled={question.hasValueGap}
          />
          <DecisionButton
            decision="needs_changes"
            label="Send back"
            variant="outline"
          />
          <DecisionButton
            decision="retire"
            label="Cut it"
            variant="destructive"
          />
        </div>
      </form>
    </li>
  );
}
