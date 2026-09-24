"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { reviewCard } from "@/app/(dashboard)/review/cards/actions";
import type { ReviewableCard } from "@/lib/card-review";
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
 * One quiz card, everything a reviewer needs to judge it, and three decisions.
 *
 * Options are shown in their stored order, not shuffled, so this page and the
 * card document can be read side by side. Students see them shuffled — which is
 * why no card may refer to another option by letter.
 *
 * There is no edit box, on purpose. The markdown in docs/cards is the source
 * and the next sync overwrites the row, so a correction typed here would
 * quietly disappear. "Send back" with a note is how a reviewer gets a fix made
 * in the place that lasts.
 */
export function CardReviewCard({
  card,
  reviewer,
}: {
  card: ReviewableCard;
  reviewer: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    reviewCard,
    {},
  );
  const [note, setNote] = useState("");

  const flagged = card.authorNote !== null;

  return (
    <li className="border-border bg-card rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {card.id}
        </span>
        <span className="text-muted-foreground text-xs">
          {card.lessonTitle ?? card.lessonSlug}
        </span>
      </div>

      <p className="text-muted-foreground mt-2 text-xs text-pretty">
        <span className="text-foreground font-medium">Assesses:</span>{" "}
        {card.objectiveText ?? card.objectiveId}
        {card.objectiveIsSafetyCritical ? (
          <span className="text-gold-strong ml-2 text-xs font-semibold tracking-[0.08em] uppercase">
            safety-critical
          </span>
        ) : null}
      </p>

      {card.hasValueGap ? (
        <p className="border-gold/40 bg-gold/10 mt-3 rounded-md border p-3 text-sm text-pretty">
          This card still has a <code>[CFI: confirm value]</code> gap — a number
          we would not guess. It cannot be approved until the value is filled in
          the card document. Tell us what it should be and we will change it
          there.
        </p>
      ) : null}

      {flagged ? (
        <div className="border-border bg-muted/40 mt-3 rounded-md border p-3">
          <p className="text-xs font-semibold tracking-[0.08em] uppercase">
            Our own doubt about this card
          </p>
          <p className="mt-1 text-sm text-pretty">{card.authorNote}</p>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            You can still approve it — but answer this in the note first, and
            your answer is recorded with the approval.
          </p>
        </div>
      ) : null}

      {card.reviewNote ? (
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          <span className="text-foreground font-medium">
            Last note from a reviewer:
          </span>{" "}
          {card.reviewNote}
        </p>
      ) : null}

      <p className="mt-3 text-pretty">{card.question}</p>

      <ul className="mt-3 flex flex-col gap-1">
        {card.options.map((option) => (
          <li
            key={option.optionId}
            className={`rounded-md px-3 py-2 text-sm ${
              option.isCorrect ? "bg-gold/10 font-medium" : ""
            }`}
          >
            {option.text}
            {option.isCorrect ? (
              <span className="text-gold-strong ml-2 text-xs font-semibold tracking-[0.08em] uppercase">
                correct
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        <span className="text-foreground font-medium">Explanation:</span>{" "}
        {card.explanation}
      </p>

      {card.visualDescription ? (
        <p className="text-muted-foreground mt-2 text-xs text-pretty">
          <span className="text-foreground font-medium">Planned picture:</span>{" "}
          {card.visualDescription}
        </p>
      ) : null}

      {card.reviewedBy ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Approved by {card.reviewedBy}
          {card.reviewedAt ? ` on ${card.reviewedAt.slice(0, 10)}` : ""}
        </p>
      ) : null}

      <form action={formAction} className="border-border mt-4 border-t pt-4">
        <input type="hidden" name="cardId" value={card.id} />
        <input type="hidden" name="reviewer" value={reviewer} />

        <Label htmlFor={`note-${card.id}`} className="text-sm">
          {flagged
            ? "Your answer to the doubt above, or what needs changing"
            : "What needs changing? (required to send back)"}
        </Label>
        <textarea
          id={`note-${card.id}`}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          placeholder={
            flagged
              ? "e.g. yes, use the technical names — they appear on the knowledge test"
              : "e.g. the second option is defensible in a high-wing trainer"
          }
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
            disabled={card.hasValueGap}
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
