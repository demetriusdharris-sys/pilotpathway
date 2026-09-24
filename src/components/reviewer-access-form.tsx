"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { grantReviewerAccess } from "@/app/(dashboard)/admin/actions";
import type { AuthState } from "@/app/(auth)/actions";

function SubmitButton({
  role,
  label,
  variant,
}: {
  role: string;
  label: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      name="role"
      value={role}
      size="sm"
      variant={variant}
      disabled={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

/**
 * Grant or remove reviewer access by email.
 *
 * Two buttons on one field rather than a dropdown: the two things you ever do
 * here are switching someone on and switching them off, and naming them is
 * clearer than picking a role out of a list whose other values this page
 * refuses anyway.
 */
export function ReviewerAccessForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    grantReviewerAccess,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <Label htmlFor="email" className="text-sm">
        Their email address
      </Label>
      <p className="text-muted-foreground mt-1 text-xs text-pretty">
        The address they signed up with. They have to have confirmed their email
        first — there is no account to change until they have.
      </p>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="off"
        placeholder="jane@example.com"
        className="border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
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
        <p className="mt-3 text-sm text-pretty">{state.message}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <SubmitButton role="mentor" label="Give reviewer access" />
        <SubmitButton
          role="student"
          label="Remove reviewer access"
          variant="outline"
        />
      </div>
    </form>
  );
}
