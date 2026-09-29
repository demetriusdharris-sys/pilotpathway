"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { grantReviewerAccess } from "@/app/(dashboard)/admin/actions";
import type { PilotProfile } from "@/lib/pilots";
import type { AuthState } from "@/app/(auth)/actions";

function GrantButton({ grant, label }: { grant: string; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      name="grant"
      value={grant}
      disabled={pending}
      className={`rounded-md px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
        grant === "yes"
          ? "bg-foreground text-background"
          : "border-border border"
      }`}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

/**
 * One flight instructor, and the one thing you want to do about them.
 *
 * A CFI who signed up is the person the content review queue has been waiting
 * for, so the action on this card is granting review — not editing their profile,
 * not vetting them for a classroom. Those are elsewhere and are different
 * decisions: reviewing questions happens at a desk, and walking into a room full
 * of children does not.
 */
export function CfiCard({
  profile,
  email,
  mayReview,
}: {
  profile: PilotProfile;
  email: string | null;
  mayReview: boolean;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    grantReviewerAccess,
    {},
  );

  return (
    <li className="border-border rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{profile.displayName}</span>
        <span
          className={`text-xs font-semibold tracking-[0.08em] uppercase ${
            mayReview ? "text-gold-strong" : "text-muted-foreground"
          }`}
        >
          {mayReview ? "Can review" : "Cannot review yet"}
        </span>
      </div>

      <p className="text-muted-foreground mt-1 text-sm">
        {profile.jobTitle}
        {profile.employer ? ` · ${profile.employer}` : ""}
      </p>

      <p className="text-muted-foreground text-xs">
        {email ?? "no email on file"}
        {profile.certificateNumber
          ? ` · certificate ${profile.certificateNumber}`
          : " · no certificate number given"}
      </p>

      <p className="text-muted-foreground mt-1 text-xs">
        Classroom clearance: {profile.vettingStatus}
      </p>

      {profile.certificateNumber ? (
        <p className="text-muted-foreground mt-2 text-xs text-pretty">
          Self-declared. Worth checking against the FAA airman registry before
          their name goes on approved content.
        </p>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs text-pretty">
          No certificate number, so there is nothing to check. Worth asking for
          one before their name goes on approved content.
        </p>
      )}

      <form action={formAction} className="mt-3">
        <input type="hidden" name="email" value={email ?? ""} />

        {state.error ? (
          <p role="alert" className="text-destructive text-xs">
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p className="text-muted-foreground text-xs">{state.message}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap gap-2">
          {mayReview ? (
            <GrantButton grant="no" label="Take review access away" />
          ) : (
            <GrantButton grant="yes" label="Let them review content" />
          )}
        </div>
      </form>
    </li>
  );
}
