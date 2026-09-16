"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount } from "@/app/(dashboard)/profile/actions";
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
      {pending ? "Deleting…" : "Delete my account"}
    </Button>
  );
}

export function DeleteAccountForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    deleteAccount,
    {},
  );

  // Controlled so the button can wait for the word. The server re-checks it;
  // this only stops an accidental tap.
  const [confirmation, setConfirmation] = useState("");
  const confirmed = isDeleteConfirmed(confirmation);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="deletePassword">Your password</Label>
        <Input
          id="deletePassword"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="deleteConfirmation">
          Type {DELETE_CONFIRMATION_WORD} to confirm
        </Label>
        <Input
          id="deleteConfirmation"
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
