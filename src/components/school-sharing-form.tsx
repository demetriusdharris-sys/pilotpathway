"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  shareProgressWithSchool,
  stopSharingProgress,
} from "@/app/(dashboard)/profile/actions";
import type { AuthState } from "@/app/(auth)/actions";
import type { SchoolSharing } from "@/lib/school-sharing";

function SubmitButton({ sharing }: { sharing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
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
          : "Share my progress"}
    </Button>
  );
}

/**
 * One school, one decision, in both directions.
 *
 * Granting and revoking are separate server actions rather than a toggle, so
 * that a mis-click cannot be read as agreement, and so that each direction
 * keeps its own wording. Both re-check the student's identity on the server.
 */
export function SchoolSharingForm({ school }: { school: SchoolSharing }) {
  const action = school.sharing ? stopSharingProgress : shareProgressWithSchool;
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <div className="border-border flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium">{school.name}</p>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          {school.sharing
            ? school.grantedBy === "guardian"
              ? "Sharing — agreed by your parent or guardian. You can stop it at any time."
              : "Sharing your lesson progress and quiz results with their staff."
            : "Not sharing. Their staff cannot see any of your progress."}
        </p>
        {state.error ? (
          <p className="text-destructive mt-2 text-sm">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-muted-foreground mt-2 text-sm">{state.message}</p>
        ) : null}
      </div>

      <form action={formAction} className="shrink-0">
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
