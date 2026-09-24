"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { reportProblem } from "@/app/(dashboard)/report/actions";
import { MAX_REASON_CHARS } from "@/lib/report-limits";
import type { AuthState } from "@/app/(auth)/actions";

function SendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
    >
      {pending ? "Sending…" : "Send"}
    </button>
  );
}

/**
 * "This looks wrong" — on a quiz card, a practice question, or a tutor reply.
 *
 * Collapsed by default and small on purpose. A student working through a lesson
 * should not be nudged toward doubting the content; this is for the moment they
 * already doubt it. It is also why the trigger is worded as a question about the
 * material rather than an invitation to complain.
 *
 * Stays open after sending, showing the answer, rather than collapsing — a
 * student who typed three sentences and watched the box vanish cannot tell
 * whether it went anywhere.
 */
export function ReportProblem({
  subjectKind,
  subjectId = "",
  lessonSlug,
  excerpt,
  label = "Something wrong with this?",
}: {
  subjectKind: "quiz_card" | "practice_question" | "tutor_message";
  /** Omitted for a tutor reply, which the server identifies by its text. */
  subjectId?: string;
  lessonSlug?: string | null;
  /** What the student is looking at, snapshotted with the report. */
  excerpt?: string | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<AuthState, FormData>(
    reportProblem,
    {},
  );
  const fieldId = useId();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground mt-2 text-xs underline-offset-4 hover:underline"
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-border mt-2 rounded-md border p-3"
    >
      <input type="hidden" name="subjectKind" value={subjectKind} />
      <input type="hidden" name="subjectId" value={subjectId} />
      {lessonSlug ? (
        <input type="hidden" name="lessonSlug" value={lessonSlug} />
      ) : null}
      {excerpt ? (
        <input type="hidden" name="excerpt" value={excerpt.slice(0, 1000)} />
      ) : null}

      <label htmlFor={fieldId} className="text-xs font-medium">
        What looks wrong?
      </label>
      <p className="text-muted-foreground mt-1 text-xs text-pretty">
        Be as specific as you can — which part, and what you think it should
        say. A flight instructor reads these.
      </p>
      <textarea
        id={fieldId}
        name="reason"
        rows={3}
        maxLength={MAX_REASON_CHARS}
        className="border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-2 py-1.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
        placeholder="e.g. it says the wind is magnetic in a written report, but I think that is only spoken"
      />

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-2 rounded-md border px-2 py-1.5 text-xs text-pretty"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p role="status" className="mt-2 text-xs text-pretty">
          {state.message}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SendButton />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground text-xs underline-offset-4 hover:underline"
        >
          {state.message ? "Close" : "Never mind"}
        </button>
      </div>
    </form>
  );
}
