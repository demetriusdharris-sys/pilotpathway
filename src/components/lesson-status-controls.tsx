"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { setLessonStatus, type ProgressState } from "@/app/(dashboard)/actions";
import type { LessonStatus } from "@/types/database";

function StatusButton({
  status,
  label,
  current,
}: {
  status: LessonStatus;
  label: string;
  current: LessonStatus;
}) {
  const { pending } = useFormStatus();
  const isCurrent = current === status;

  return (
    <Button
      type="submit"
      name="status"
      value={status}
      variant={isCurrent ? "default" : "outline"}
      disabled={pending || isCurrent}
    >
      {label}
    </Button>
  );
}

export function LessonStatusControls({
  lessonSlug,
  status,
}: {
  lessonSlug: string;
  status: LessonStatus;
}) {
  const [state, formAction] = useActionState<ProgressState, FormData>(
    setLessonStatus,
    {},
  );

  return (
    <form action={formAction} className="mt-10 flex flex-col gap-3">
      <input type="hidden" name="lessonSlug" value={lessonSlug} />

      <span className="text-sm font-semibold tracking-[0.15em] uppercase">
        Your progress
      </span>

      <div className="flex flex-wrap gap-3">
        <StatusButton
          status="in_progress"
          label="Mark in progress"
          current={status}
        />
        <StatusButton
          status="completed"
          label="Mark complete"
          current={status}
        />
        <StatusButton status="not_started" label="Reset" current={status} />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
