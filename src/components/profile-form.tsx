"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/(dashboard)/profile/actions";
import type { AuthState } from "@/app/(auth)/actions";

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

function ReadOnlyField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <p className="border-border bg-muted/40 text-foreground rounded-md border px-3 py-2 text-sm">
        {value}
      </p>
      <p className="text-muted-foreground text-xs text-pretty">{note}</p>
    </div>
  );
}

export function ProfileForm({
  firstName,
  dateOfBirth,
  email,
  maxDateOfBirth,
}: {
  firstName: string | null;
  /** Null means it has never been set, and the input is offered. */
  dateOfBirth: string | null;
  email: string;
  /**
   * Latest date that clears the 13+ gate, `YYYY-MM-DD`, computed on the
   * server. This component must not derive it: a date computed during render
   * differs between the server and client passes across midnight, which React
   * reports as a hydration mismatch.
   */
  maxDateOfBirth?: string;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    updateProfile,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="firstName">
          First name{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="firstName"
          name="firstName"
          type="text"
          autoComplete="given-name"
          maxLength={60}
          defaultValue={firstName ?? ""}
          placeholder="What should your instructor call you?"
        />
        <p className="text-muted-foreground text-xs text-pretty">
          What Captain Path calls you. Leave it blank and it simply won&apos;t
          use a name.
        </p>
      </div>

      {dateOfBirth === null ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            min="1900-01-01"
            max={maxDateOfBirth}
          />
          <p className="text-muted-foreground text-xs text-pretty">
            You must be at least 13. Under 18, a parent or guardian will need to
            approve some features. Once you set this it cannot be changed, so
            check it before saving.
          </p>
        </div>
      ) : (
        <ReadOnlyField
          label="Date of birth"
          value={dateOfBirth}
          note="This cannot be changed once set. If it is wrong, tell your program lead."
        />
      )}

      <ReadOnlyField
        label="Email"
        value={email}
        note="This is the address you log in with and cannot be changed here."
      />

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="border-border bg-secondary text-secondary-foreground rounded-md border px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <SaveButton />
      </div>
    </form>
  );
}
