"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  shareStudentProgress,
  stopStudentProgressSharing,
} from "@/app/(dashboard)/profile/actions";
import type { AuthState } from "@/app/(auth)/actions";
import type { SchoolSharing } from "@/lib/school-sharing";

function SubmitButton({ sharing }: { sharing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      variant={sharing ? "outline" : "default"}
      disabled={pending}
      className={sharing ? "" : "bg-gold text-gold-foreground hover:bg-gold/90"}
    >
      {pending
        ? sharing
          ? "Stopping…"
          : "Sharing…"
        : sharing
          ? "Stop sharing"
          : "Share their progress"}
    </Button>
  );
}

/**
 * A guardian deciding, for one student and one school.
 *
 * The student keeps the same control on their own profile and can stop it
 * themselves, which is why the wording here never implies the decision is
 * final or exclusively the guardian's.
 */
export function GuardianSchoolSharingForm({
  studentId,
  studentLabel,
  school,
}: {
  studentId: string;
  studentLabel: string;
  school: SchoolSharing;
}) {
  const action = school.sharing
    ? stopStudentProgressSharing
    : shareStudentProgress;
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <div className="border-border mt-3 flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{school.name}</p>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {school.sharing
            ? school.grantedBy === "guardian"
              ? `Sharing — you agreed to this. ${studentLabel} can also stop it themselves.`
              : `Sharing — ${studentLabel} agreed to this themselves.`
            : "Not sharing. Staff there cannot see their progress."}
        </p>
        {state.error ? (
          <p className="text-destructive mt-2 text-sm">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-muted-foreground mt-2 text-sm">{state.message}</p>
        ) : null}
      </div>

      <form action={formAction} className="shrink-0">
        <input type="hidden" name="studentId" value={studentId} />
        <input
          type="hidden"
          name="organizationId"
          value={school.organizationId}
        />
        <SubmitButton sharing={school.sharing} />
      </form>
    </div>
  );
}
