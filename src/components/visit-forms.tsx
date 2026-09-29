"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  askForVisit,
  callOffVisit,
  offerForVisit,
  pickPilot,
  pullOutOfVisit,
  recordVisitHappened,
} from "@/app/(dashboard)/visits/actions";
import { GRADE_LABEL, type VisitOffer } from "@/lib/visits";
import type { AuthState } from "@/app/(auth)/actions";

const field =
  "border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

function Submit({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "destructive";
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
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

/** A school asks for a pilot. */
export function RequestVisitForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    askForVisit,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {organizations.length === 1 ? (
          <input
            type="hidden"
            name="organizationId"
            value={organizations[0].id}
          />
        ) : (
          <div>
            <Label htmlFor="organizationId">School</Label>
            <select
              id="organizationId"
              name="organizationId"
              className={field}
              required
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Label htmlFor="gradeLevel">Ages in the room</Label>
          <select id="gradeLevel" name="gradeLevel" className={field} required>
            {Object.entries(GRADE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="expectedStudents">Roughly how many students</Label>
          <Input
            id="expectedStudents"
            name="expectedStudents"
            type="number"
            min={1}
            max={2000}
            required
          />
        </div>

        <div>
          <Label htmlFor="format">In person or by video</Label>
          <select id="format" name="format" className={field} required>
            <option value="in_person">A pilot comes to us</option>
            <option value="virtual">A pilot joins by video</option>
          </select>
        </div>

        <div>
          <Label htmlFor="subject">Class or occasion (optional)</Label>
          <Input
            id="subject"
            name="subject"
            placeholder="Physics, or career day"
          />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <Input id="city" name="city" placeholder="Compton" />
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <Input id="state" name="state" maxLength={2} placeholder="CA" />
        </div>

        <div>
          <Label htmlFor="windowStart">Any time from</Label>
          <Input id="windowStart" name="windowStart" type="date" required />
        </div>

        <div>
          <Label htmlFor="windowEnd">Until</Label>
          <Input id="windowEnd" name="windowEnd" type="date" required />
        </div>
      </div>

      <div className="mt-4">
        <Label htmlFor="notes">Anything a pilot should know (optional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          className={field}
          placeholder="Most of our students have never been to an airport. Two of them have asked about flight school."
        />
      </div>

      <Feedback state={state} />

      <div className="mt-4">
        <Submit label="Ask for a pilot" />
      </div>
    </form>
  );
}

/** A verified pilot offers to take it, or pulls out. */
export function OfferForm({
  visitId,
  offered,
}: {
  visitId: string;
  offered: boolean;
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    offered ? pullOutOfVisit : offerForVisit,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="visitId" value={visitId} />

      {offered ? (
        <p className="text-sm text-pretty">
          You have offered for this one. The school chooses who comes.
        </p>
      ) : (
        <>
          <Label htmlFor="message">A note for the school (optional)</Label>
          <textarea
            id="message"
            name="message"
            rows={3}
            maxLength={1000}
            className={field}
            placeholder="I grew up ten minutes from there, and I fly out of Long Beach on Tuesdays."
          />
        </>
      )}

      <Feedback state={state} />

      <div className="mt-3">
        <Submit
          label={offered ? "Withdraw" : "Offer to take this"}
          variant={offered ? "outline" : undefined}
        />
      </div>
    </form>
  );
}

/** The school picks one of the pilots who offered. */
export function PickPilotForm({
  visitId,
  offers,
}: {
  visitId: string;
  offers: VisitOffer[];
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    pickPilot,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="visitId" value={visitId} />

      <Label htmlFor="pilot">Who is coming</Label>
      <select id="pilot" name="pilot" className={field} required>
        {offers.map((offer) => (
          <option key={offer.pilotUserId} value={offer.pilotUserId}>
            {offer.pilotName ?? "A pilot"}
            {offer.pilotJobTitle ? ` — ${offer.pilotJobTitle}` : ""}
          </option>
        ))}
      </select>

      <div className="mt-4">
        <Label htmlFor="when">Date and time</Label>
        <Input id="when" name="when" type="datetime-local" required />
      </div>

      <Feedback state={state} />

      <div className="mt-4">
        <Submit label="Confirm the visit" />
      </div>
    </form>
  );
}

/** Afterwards, the school says what happened. */
export function RecordVisitForm({ visitId }: { visitId: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    recordVisitHappened,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="visitId" value={visitId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="studentsAttended">
            Students actually in the room
          </Label>
          <Input
            id="studentsAttended"
            name="studentsAttended"
            type="number"
            min={0}
            max={2000}
            required
          />
          <p className="text-muted-foreground mt-1 text-xs text-pretty">
            Your count, not the pilot&rsquo;s. This is the number a sponsor
            sees.
          </p>
        </div>
        <div>
          <Label htmlFor="durationMinutes">How long it ran (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            max={480}
          />
        </div>
      </div>

      <Feedback state={state} />

      <div className="mt-4">
        <Submit label="Record what happened" />
      </div>
    </form>
  );
}

/** Either side can call it off. */
export function CancelVisitForm({ visitId }: { visitId: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    callOffVisit,
    {},
  );

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="visitId" value={visitId} />
      <Label htmlFor="reason">Why it is not happening (optional)</Label>
      <Input id="reason" name="reason" placeholder="School closed that week" />
      <Feedback state={state} />
      <div className="mt-3">
        <Submit label="Cancel this visit" variant="destructive" />
      </div>
    </form>
  );
}
