"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ROUTE_IN_LABEL, type PilotProfile } from "@/lib/pilots";
import { vetPilot } from "@/app/(dashboard)/admin/actions";
import type { AuthState } from "@/app/(auth)/actions";

function VetButton({ status, label }: { status: string; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="status"
      value={status}
      disabled={pending}
      className="border-border rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * One pilot, and whether they may be sent to a classroom.
 *
 * The background check itself is never entered here and never stored. What this
 * records is that a named person attested one was done, and when it is due
 * again — the report belongs to whoever ran it.
 */
export function PilotVettingForm({
  profile,
  email,
}: {
  profile: PilotProfile;
  email: string | null;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(vetPilot, {});

  return (
    <li className="border-border rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{profile.displayName}</span>
        <span
          className={`text-xs font-semibold tracking-[0.08em] uppercase ${
            profile.vettingStatus === "verified"
              ? "text-gold-strong"
              : "text-muted-foreground"
          }`}
        >
          {profile.vettingStatus}
        </span>
      </div>

      <p className="text-muted-foreground mt-1 text-sm">
        {profile.jobTitle}
        {profile.employer ? ` · ${profile.employer}` : ""}
      </p>
      <p className="text-muted-foreground text-xs">
        {email ?? "no email on file"}
        {profile.grewUpIn ? ` · grew up in ${profile.grewUpIn}` : ""}
        {profile.routeIn ? ` · ${ROUTE_IN_LABEL[profile.routeIn]}` : ""}
      </p>

      {profile.story ? (
        <p className="text-muted-foreground border-border mt-3 border-l-2 pl-3 text-xs text-pretty">
          {profile.story.slice(0, 400)}
          {profile.story.length > 400 ? "…" : ""}
        </p>
      ) : (
        <p className="text-muted-foreground mt-3 text-xs">
          No story written yet — worth asking for before a visit.
        </p>
      )}

      <form action={formAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="email" value={email ?? ""} />
        <div className="flex flex-wrap gap-2">
          <input
            name="vettedBy"
            placeholder="Who checked them"
            defaultValue={profile.vettedBy ?? ""}
            className="border-input bg-background focus-visible:ring-ring min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
          />
          <input
            name="expires"
            type="date"
            defaultValue={profile.vettingExpiresAt ?? ""}
            className="border-input bg-background rounded-md border px-2 py-1.5 text-xs"
          />
        </div>
        <input
          name="note"
          placeholder="Note (never the report itself)"
          defaultValue={profile.vettingNote ?? ""}
          className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-2 py-1.5 text-xs focus-visible:ring-2 focus-visible:outline-none"
        />

        {state.error ? (
          <p role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        ) : null}
        {state.message ? (
          <p className="text-muted-foreground text-xs">{state.message}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <VetButton status="verified" label="Cleared" />
          <VetButton status="pending" label="Check underway" />
          <VetButton status="declined" label="Not cleared" />
          <VetButton status="unverified" label="Reset" />
        </div>
      </form>
    </li>
  );
}
