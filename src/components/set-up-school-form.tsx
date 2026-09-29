"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { addOrganization } from "@/app/(dashboard)/admin/actions";
import { ORG_TYPE_LABEL } from "@/lib/organizations";
import type { AuthState } from "@/app/(auth)/actions";

const field =
  "border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Setting up…" : "Set up my school"}
    </Button>
  );
}

/**
 * A teacher sets up their own school.
 *
 * The same Server Action an administrator uses — `create_organization` works out
 * from the caller whether this arrives verified. A teacher's does not, and that
 * is deliberate rather than a limitation: an unconfirmed school can ask for a
 * pilot straight away, because a visit touches no student, but it cannot enrol
 * one and none of its visits can be confirmed until somebody has checked it is
 * real.
 *
 * Whoever sets it up runs it. There is no field to hand it to somebody else,
 * because that is not something a teacher needs to do and is something an
 * impostor would.
 */
export function SetUpSchoolForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    addOrganization,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="schoolName">What is it called</Label>
          <Input
            id="schoolName"
            name="name"
            placeholder="Jefferson High School"
            required
          />
        </div>
        <div>
          <Label htmlFor="schoolType">What kind</Label>
          <select id="schoolType" name="orgType" className={field} required>
            {Object.entries(ORG_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mt-3 rounded-md border px-3 py-2 text-sm text-pretty"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p role="status" className="mt-3 text-sm text-pretty">
          {state.message}
        </p>
      ) : null}

      <div className="mt-4">
        <SubmitButton />
      </div>

      <p className="text-muted-foreground mt-3 text-xs text-pretty">
        You can ask for a pilot as soon as this is set up. We check that a
        school is real before a pilot commits to coming, and before any student
        can be enrolled — it is usually quick.
      </p>
    </form>
  );
}
