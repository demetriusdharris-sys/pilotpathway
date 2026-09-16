"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteStudentAccount } from "@/app/(dashboard)/profile/actions";
import type { AuthState } from "@/app/(auth)/actions";
import {
  DELETE_CONFIRMATION_WORD,
  isDeleteConfirmed,
} from "@/lib/account-deletion";

function DeleteButton({ confirmed }: { confirmed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={!confirmed || pending}
    >
      {pending ? "Deleting…" : "Delete their account"}
    </Button>
  );
}

/**
 * Separate from DeleteAccountForm rather than a variant of it, so a guardian
 * deleting someone else's account can never share a code path — or a button
 * label — with a student deleting their own. The confirmation word is still
 * the one shared definition in account-deletion.ts.
 */
export function GuardianDeleteStudentForm({
  studentId,
  studentLabel,
}: {
  studentId: string;
  studentLabel: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    deleteStudentAccount,
    {},
  );
  const [confirmation, setConfirmation] = useState("");
  const confirmed = isDeleteConfirmed(confirmation);

  // Ids are namespaced by student so two linked students on one page never
  // share a label target.
  const passwordId = `guardian-delete-password-${studentId}`;
  const confirmId = `guardian-delete-confirm-${studentId}`;

  if (state.message) {
    return (
      <p
        role="status"
        className="border-border bg-secondary text-secondary-foreground mt-4 rounded-md border px-3 py-2 text-sm"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="studentId" value={studentId} />

      <p className="text-muted-foreground text-sm text-pretty">
        This permanently removes {studentLabel}&apos;s profile, lesson progress,
        instructor conversations, and quiz answers.{" "}
        <strong className="text-foreground">It cannot be undone.</strong>
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>Your password</Label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={confirmId}>
          Type {DELETE_CONFIRMATION_WORD} to confirm
        </Label>
        <Input
          id={confirmId}
          name="confirmation"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm text-pretty"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <DeleteButton confirmed={confirmed} />
      </div>
    </form>
  );
}
