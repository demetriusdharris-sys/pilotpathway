"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { savePilot } from "@/app/(dashboard)/pilot/actions";
import {
  ROUTE_IN_LABEL,
  type Affiliation,
  type PilotProfile,
} from "@/lib/pilots";
import type { AuthState } from "@/app/(auth)/actions";

function SaveButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create my profile" : "Save changes"}
    </Button>
  );
}

const field =
  "border-input bg-background focus-visible:ring-ring mt-2 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

/**
 * A pilot's own profile.
 *
 * Ordered deliberately: the story comes before the logistics. A pilot filling
 * this in should understand from the shape of the page that what a student needs
 * is who they are and how they got there, not their type ratings.
 *
 * The vetting fields are absent. A pilot cannot set them here, cannot set them
 * through the action, and would be refused by the column grant if they tried —
 * three layers, because an unvetted adult in a classroom is the one failure in
 * this feature that would actually hurt someone.
 */
export function PilotProfileForm({
  profile,
  affiliations,
}: {
  profile: PilotProfile | null;
  affiliations: Affiliation[];
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    savePilot,
    {},
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-semibold">How a class meets you</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Students remember a person, not a résumé.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Name to introduce you by</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile?.displayName ?? ""}
              placeholder="Captain Marcus Webb"
              required
            />
          </div>
          <div>
            <Label htmlFor="jobTitle">What you fly, and your seat</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              defaultValue={profile?.jobTitle ?? ""}
              placeholder="First Officer, Boeing 737"
              required
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Write it the way you would say it out loud, not in abbreviations.
            </p>
          </div>
          <div>
            <Label htmlFor="employer">Who you fly for (optional)</Label>
            <Input
              id="employer"
              name="employer"
              defaultValue={profile?.employer ?? ""}
              placeholder="Southwest Airlines"
            />
          </div>
          <div>
            <Label htmlFor="grewUpIn">Where you grew up</Label>
            <Input
              id="grewUpIn"
              name="grewUpIn"
              defaultValue={profile?.grewUpIn ?? ""}
              placeholder="Compton, California"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              For a lot of students this is the line that changes the room.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your story</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Written for a sixteen-year-old who has never been inside an airport
          and is quietly wondering whether people like them do this.
        </p>

        <div className="mt-4">
          <Label htmlFor="story">How you got here</Label>
          <textarea
            id="story"
            name="story"
            rows={6}
            maxLength={2000}
            defaultValue={profile?.story ?? ""}
            className={field}
            placeholder="I was nineteen and working at a car wash when somebody let me sit in the right seat of a Cessna…"
          />
        </div>

        <div className="mt-4">
          <Label htmlFor="wishIHadKnown">
            What you wish you had known at their age (optional)
          </Label>
          <textarea
            id="wishIHadKnown"
            name="wishIHadKnown"
            rows={3}
            maxLength={500}
            defaultValue={profile?.wishIHadKnown ?? ""}
            className={field}
            placeholder="That nobody was going to tap me on the shoulder and invite me in."
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="routeIn">How you got your training</Label>
            <select
              id="routeIn"
              name="routeIn"
              defaultValue={profile?.routeIn ?? ""}
              className={field}
            >
              <option value="">Prefer not to say</option>
              {Object.entries(ROUTE_IN_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="firstInFamily">First in your family to fly?</Label>
            <select
              id="firstInFamily"
              name="firstInFamily"
              defaultValue={
                profile?.firstInFamily === true
                  ? "yes"
                  : profile?.firstInFamily === false
                    ? "no"
                    : ""
              }
              className={field}
            >
              <option value="">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Where you belong</h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Shown to students as &ldquo;a member of …&rdquo;. Tick any that are
          yours — for a student who has never seen a pilot who looks like them,
          this is often the most useful thing on the page.
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Affiliations</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {affiliations.map((affiliation) => (
              <label
                key={affiliation.slug}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="affiliations"
                  value={affiliation.slug}
                  defaultChecked={profile?.affiliations.includes(
                    affiliation.slug,
                  )}
                  className="size-4"
                />
                {affiliation.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <Label htmlFor="languages">Languages you can present in</Label>
          <Input
            id="languages"
            name="languages"
            defaultValue={profile?.languages.join(", ") ?? ""}
            placeholder="English, Spanish"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Separated by commas.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          Which classrooms you can reach
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="homeCity">City you are based in</Label>
            <Input
              id="homeCity"
              name="homeCity"
              defaultValue={profile?.homeCity ?? ""}
              placeholder="Long Beach"
            />
          </div>
          <div>
            <Label htmlFor="homeState">State</Label>
            <Input
              id="homeState"
              name="homeState"
              maxLength={2}
              defaultValue={profile?.homeState ?? ""}
              placeholder="CA"
            />
          </div>
          <div>
            <Label htmlFor="homeAirport">Home airport (optional)</Label>
            <Input
              id="homeAirport"
              name="homeAirport"
              maxLength={4}
              defaultValue={profile?.homeAirport ?? ""}
              placeholder="LGB"
            />
          </div>
          <div>
            <Label htmlFor="travelRadiusMiles">
              How far you will travel (miles)
            </Label>
            <Input
              id="travelRadiusMiles"
              name="travelRadiusMiles"
              type="number"
              min={0}
              max={3000}
              defaultValue={profile?.travelRadiusMiles ?? ""}
              placeholder="50"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="willDoVirtual"
            defaultChecked={profile?.willDoVirtual ?? true}
            className="size-4"
          />
          I will also join a classroom by video
        </label>
        <p className="text-muted-foreground mt-1 text-xs text-pretty">
          Video is how a rural school two states away gets a pilot at all.
        </p>
      </section>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm text-pretty"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p role="status" className="text-sm">
          {state.message}
        </p>
      ) : null}

      <div>
        <SaveButton isNew={profile === null} />
      </div>
    </form>
  );
}
