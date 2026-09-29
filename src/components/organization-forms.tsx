"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  addOrganization,
  changeOrganizationMember,
} from "@/app/(dashboard)/admin/actions";
import {
  ORG_ROLE_LABEL,
  ORG_TYPE_LABEL,
  type OrganizationSummary,
} from "@/lib/organizations";
import type { AuthState } from "@/app/(auth)/actions";

const field =
  "border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

function Submit({
  label,
  name,
  value,
  variant,
}: {
  label: string;
  name?: string;
  value?: string;
  variant?: "outline" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      size="sm"
      name={name}
      value={value}
      variant={variant}
      disabled={pending}
    >
      {pending ? "Saving…" : label}
    </Button>
  );
}

function Feedback({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="border-destructive/30 bg-destructive/10 text-destructive mt-3 rounded-md border px-3 py-2 text-sm text-pretty"
      >
        {state.error}
      </p>
    );
  }

  if (state.message) {
    return (
      <p role="status" className="mt-3 text-sm text-pretty">
        {state.message}
      </p>
    );
  }

  return null;
}

/** Create a school. An administrator's act — a school cannot register itself. */
export function CreateOrganizationForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(
    addOrganization,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="orgName">Name</Label>
          <Input
            id="orgName"
            name="name"
            placeholder="Jefferson High School"
            required
          />
        </div>
        <div>
          <Label htmlFor="orgType">What it is</Label>
          <select id="orgType" name="orgType" className={field} required>
            {Object.entries(ORG_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="adminEmail">Email of whoever runs it (optional)</Label>
        <Input
          id="adminEmail"
          name="adminEmail"
          type="email"
          placeholder="teacher@jefferson.edu"
        />
        <p className="text-muted-foreground mt-1 text-xs text-pretty">
          They have to have signed up already. Once named, they add their own
          teachers — which is the point, so you are not doing it at the third
          school.
        </p>
      </div>

      <Feedback state={state} />

      <div className="mt-4">
        <Submit label="Create it" />
      </div>
    </form>
  );
}

/** Add, change or remove one person at one organisation. */
export function OrganizationMembersForm({
  organization,
}: {
  organization: OrganizationSummary;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    changeOrganizationMember,
    {},
  );

  const staff = organization.members.filter(
    (member) => member.orgRole !== "member",
  );
  const students = organization.members.filter(
    (member) => member.orgRole === "member",
  );

  return (
    <li className="border-border rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{organization.name}</span>
        <span className="text-muted-foreground text-xs">
          {ORG_TYPE_LABEL[organization.orgType] ?? organization.orgType}
          {students.length > 0
            ? ` · ${students.length} enrolled student${students.length === 1 ? "" : "s"}`
            : ""}
        </span>
      </div>

      {staff.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          Nobody runs this yet. Until somebody does, no visit can be asked for.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {staff.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-baseline justify-between gap-2"
            >
              <span>{member.email ?? member.userId}</span>
              <span className="text-muted-foreground text-xs">
                {ORG_ROLE_LABEL[member.orgRole] ?? member.orgRole}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="border-border mt-3 border-t pt-3">
        <input type="hidden" name="organizationId" value={organization.id} />

        <div className="flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            placeholder="their email"
            className="border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
          />
          <select
            name="orgRole"
            defaultValue="staff"
            className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
          >
            <option value="staff">Staff</option>
            <option value="org_admin">Runs this school</option>
            <option value="member">Enrolled student</option>
          </select>
        </div>

        <Feedback state={state} />

        <div className="mt-2 flex flex-wrap gap-2">
          <Submit label="Add or change" name="intent" value="set" />
          <Submit
            label="Remove"
            name="intent"
            value="remove"
            variant="outline"
          />
        </div>
        <p className="text-muted-foreground mt-2 text-xs text-pretty">
          Removing somebody ends their access immediately. Every change here is
          recorded permanently.
        </p>
      </form>
    </li>
  );
}
