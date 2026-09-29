"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { renderDiagram } from "@/components/diagrams";
import { reviewDiagram } from "@/app/(dashboard)/review/diagrams/actions";
import type { ReviewableDiagram } from "@/lib/diagrams/review";
import type { AuthState } from "@/app/(auth)/actions";

function DecisionButton({
  decision,
  label,
  variant,
}: {
  decision: string;
  label: string;
  variant?: "default" | "outline" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      name="decision"
      value={decision}
      size="sm"
      variant={variant}
      disabled={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * One diagram, drawn exactly as a student will see it.
 *
 * Rendering the real component rather than a description is the point: a
 * reviewer has to judge whether the picture is right, and a caption saying
 * "arrows showing the four forces" tells them nothing about whether the arrows
 * point the right way.
 *
 * No edit box, for the cards' reason. The drawing is a React component and the
 * caption is in the catalogue; a correction typed here would be overwritten by
 * the next sync.
 */
export function DiagramReviewCard({
  diagram,
  reviewer,
}: {
  diagram: ReviewableDiagram;
  reviewer: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    reviewDiagram,
    {},
  );
  const [note, setNote] = useState("");

  return (
    <li className="border-border bg-card rounded-lg border p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          {diagram.key}
        </span>
        <span className="text-muted-foreground text-xs">
          {diagram.lessonTitle ?? diagram.lessonSlug}
        </span>
      </div>

      <h3 className="mt-2 font-semibold">{diagram.title}</h3>

      <div className="border-border bg-background mt-3 rounded-md border p-4">
        {renderDiagram(diagram.key) ?? (
          <p className="text-muted-foreground text-sm">
            No drawing is wired to this key, so nothing would render on the
            lesson. Worth cutting rather than approving.
          </p>
        )}
      </div>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        <span className="text-foreground font-medium">Caption:</span>{" "}
        {diagram.caption}
      </p>

      <p className="text-muted-foreground mt-2 text-xs text-pretty">
        <span className="text-foreground font-medium">Drawn from:</span>{" "}
        {diagram.sourceNote ?? "not recorded"}
      </p>

      {diagram.reviewNote ? (
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          <span className="text-foreground font-medium">Last note:</span>{" "}
          {diagram.reviewNote}
        </p>
      ) : null}

      {diagram.reviewedBy ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Approved by {diagram.reviewedBy}
          {diagram.reviewedAt ? ` on ${diagram.reviewedAt.slice(0, 10)}` : ""}
        </p>
      ) : null}

      <form action={formAction} className="border-border mt-4 border-t pt-4">
        <input type="hidden" name="diagramKey" value={diagram.key} />
        <input type="hidden" name="reviewer" value={reviewer} />

        <Label htmlFor={`note-${diagram.key}`} className="text-sm">
          What needs changing? (required to send back)
        </Label>
        <textarea
          id={`note-${diagram.key}`}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          className="border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          placeholder="e.g. the lift arrow should act through the centre of pressure, not the centre of gravity"
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
          <DecisionButton decision="approve" label="Approve" />
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
