"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { triageReport } from "@/app/(dashboard)/admin/actions";
import type { ContentReport } from "@/lib/content-reports";
import type { AuthState } from "@/app/(auth)/actions";

const KIND_LABEL: Record<string, string> = {
  quiz_card: "Quiz card",
  practice_question: "Practice question",
  tutor_message: "Tutor reply",
};

function TriageButton({
  status,
  label,
  variant,
}: {
  status: string;
  label: string;
  variant?: "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
        variant === "outline"
          ? "border-border border"
          : "bg-foreground text-background"
      }`}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * One student report, and what to do with it.
 *
 * Deliberately no button that touches the reported content. Sending a card back
 * to the CFI is a decision made in the review queue, by a person who has read
 * both the card and the claim — a one-click "send to CFI" here would make a
 * student's report an action, which is exactly what this table exists not to be.
 */
export function ReportTriage({ report }: { report: ContentReport }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    triageReport,
    {},
  );

  return (
    <li className="border-border rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold tracking-[0.08em] uppercase">
          {KIND_LABEL[report.subjectKind] ?? report.subjectKind}
        </span>
        <span className="text-muted-foreground text-xs">
          {report.createdAt.slice(0, 16).replace("T", " ")}
          {report.lessonSlug ? ` · ${report.lessonSlug}` : ""}
        </span>
      </div>

      <p className="mt-2 text-sm text-pretty">{report.reason}</p>

      {report.subjectExcerpt ? (
        <p className="text-muted-foreground border-border mt-3 border-l-2 pl-3 text-xs text-pretty">
          {report.subjectExcerpt}
        </p>
      ) : null}

      <p className="text-muted-foreground mt-3 font-mono text-xs break-all">
        {report.subjectId}
      </p>

      <p className="text-muted-foreground mt-1 text-xs">
        {report.reporterEmail ?? "reporter's account has been deleted"}
      </p>

      <form action={formAction} className="mt-3">
        <input type="hidden" name="reportId" value={report.id} />
        <input
          name="note"
          placeholder="What you concluded (optional)"
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
        />

        {state.error ? (
          <p role="alert" className="text-destructive mt-2 text-xs">
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p className="text-muted-foreground mt-2 text-xs">{state.message}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          <TriageButton status="actioned" label="Handled" />
          <TriageButton
            status="triaged"
            label="Looking into it"
            variant="outline"
          />
          <TriageButton
            status="dismissed"
            label="No change needed"
            variant="outline"
          />
        </div>
      </form>
    </li>
  );
}
