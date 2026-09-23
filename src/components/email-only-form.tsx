"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/(auth)/actions";

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

/**
 * An email address and nothing else.
 *
 * The field is controlled for the same reason as the ones in auth-form: React
 * 19 clears an uncontrolled input when a form action finishes, so a student
 * who mistyped their address would have to type the whole thing again.
 */
export function EmailOnlyForm({
  action,
  submitLabel,
  pendingLabel,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  pendingLabel: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});
  const [email, setEmail] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="resetEmail">Email</Label>
        <Input
          id="resetEmail"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p className="text-muted-foreground rounded-md border px-3 py-2 text-sm text-pretty">
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
