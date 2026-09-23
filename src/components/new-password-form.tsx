"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setNewPassword, type AuthState } from "@/app/(auth)/actions";

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={!ready || pending}>
      {pending ? "Saving…" : "Save new password"}
    </Button>
  );
}

/**
 * Sets a new password from a recovery link.
 *
 * Typed twice, because there is no "current password" to catch a typo against
 * and the student is about to be locked out by their own mistake if it is
 * wrong. Both checks here are conveniences; the length rule is re-checked on
 * the server, which is what actually enforces it.
 */
export function NewPasswordForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    setNewPassword,
    {},
  );

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const longEnough = password.length >= 8;
  const matches = password === confirmation;
  const ready = longEnough && matches;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">At least 8 characters.</p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Type it again</Label>
        <Input
          id="confirmPassword"
          name="confirmation"
          type="password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
        {confirmation.length > 0 && !matches ? (
          <p className="text-destructive text-xs">
            These two do not match yet.
          </p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton ready={ready} />
    </form>
  );
}
