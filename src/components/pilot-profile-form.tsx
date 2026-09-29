"use client";

import { useActionState, useState } from "react";
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
 * EVERY FIELD IS CONTROLLED, ON PURPOSE. React 19 resets a form when its action
 * finishes, which wipes uncontrolled inputs back to nothing — the same trap
 * `auth-form.tsx` is controlled to avoid, and CLAUDE.md names it explicitly.
 *
 * It bit here in testing and it bit silently: a save that failed validation on
 * the certificate number came back with "I am a flight instructor" unticked, so
 * the next save wrote `is_cfi = false` and the pilot disappeared from the
 * Flight instructors list on /admin. Nobody would have noticed from the screen —
 * the checkbox simply looked unticked, which is indistinguishable from a pilot
 * who never ticked it. Do not convert these back to defaultValue/defaultChecked.
 *
 * FIRST RUN IS A WIZARD; EDITING IS THE WHOLE PAGE. A pilot creating a profile
 * sees one topic at a time with "Step 2 of 4 · about 3 minutes", which is what
 * makes the pitch demo feel lighter than a single long form. A pilot coming back
 * to change something sees everything at once, because hunting for a field
 * through four steps is worse than scrolling.
 *
 * Every step stays mounted and is hidden with the `hidden` attribute rather than
 * unmounted. That keeps all the fields in the form so one submit sends the lot,
 * keeps the controlled state intact, and takes hidden steps out of the
 * accessibility tree, which is what a screen reader should hear.
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

  // A pilot with no profile yet is walked through it. One coming back to edit
  // sees the whole page, because hunting through four steps for one field is
  // worse than scrolling past three sections.
  const stepped = profile === null;
  const [step, setStep] = useState(0);

  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle ?? "");
  const [employer, setEmployer] = useState(profile?.employer ?? "");
  const [grewUpIn, setGrewUpIn] = useState(profile?.grewUpIn ?? "");
  const [story, setStory] = useState(profile?.story ?? "");
  const [wishIHadKnown, setWishIHadKnown] = useState(
    profile?.wishIHadKnown ?? "",
  );
  const [routeIn, setRouteIn] = useState(profile?.routeIn ?? "");
  const [firstInFamily, setFirstInFamily] = useState(
    profile?.firstInFamily === true
      ? "yes"
      : profile?.firstInFamily === false
        ? "no"
        : "",
  );
  const [isCfi, setIsCfi] = useState(profile?.isCfi ?? false);
  const [certificateNumber, setCertificateNumber] = useState(
    profile?.certificateNumber ?? "",
  );
  const [languages, setLanguages] = useState(
    profile?.languages.join(", ") ?? "",
  );
  const [chosen, setChosen] = useState<string[]>(profile?.affiliations ?? []);
  const [homeCity, setHomeCity] = useState(profile?.homeCity ?? "");
  const [homeState, setHomeState] = useState(profile?.homeState ?? "");
  const [homeAirport, setHomeAirport] = useState(profile?.homeAirport ?? "");
  const [travelRadius, setTravelRadius] = useState(
    profile?.travelRadiusMiles?.toString() ?? "",
  );
  const [willDoVirtual, setWillDoVirtual] = useState(
    profile?.willDoVirtual ?? true,
  );

  const STEPS = [
    {
      title: "How a class meets you",
      subtitle: "Students remember a person, not a résumé.",
    },
    { title: "Your story", subtitle: "The part that actually changes a room." },
    {
      title: "Where you belong",
      subtitle: "What a student might recognise themselves in.",
    },
    {
      title: "Which classrooms you can reach",
      subtitle: "So we only send you somewhere you can get to.",
    },
  ];

  // The only two fields the database insists on. Checked here so Continue does
  // not walk somebody to step four and then fail on step one.
  const firstStepReady =
    displayName.trim().length >= 2 && jobTitle.trim().length >= 2;

  function toggleAffiliation(slug: string) {
    setChosen((current) =>
      current.includes(slug)
        ? current.filter((entry) => entry !== slug)
        : [...current, slug],
    );
  }

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-8">
      {stepped ? (
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
            Step {step + 1} of {STEPS.length} · about 3 minutes
          </p>
          <div
            className="bg-muted mt-2 h-1 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="How far through setting up your profile"
          >
            <div
              className="bg-gold-strong h-full transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold">{STEPS[step].title}</h2>
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {STEPS[step].subtitle}
          </p>
        </div>
      ) : null}

      <section hidden={stepped && step !== 0}>
        <h2 className="text-lg font-semibold" hidden={stepped}>
          How a class meets you
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Students remember a person, not a résumé.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="displayName">Name to introduce you by</Label>
            <Input
              id="displayName"
              name="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Captain Marcus Webb"
              required
            />
          </div>
          <div>
            <Label htmlFor="jobTitle">What you fly, and your seat</Label>
            <Input
              id="jobTitle"
              name="jobTitle"
              value={jobTitle}
              onChange={(event) => setJobTitle(event.target.value)}
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
              value={employer}
              onChange={(event) => setEmployer(event.target.value)}
              placeholder="Southwest Airlines"
            />
          </div>
          <div>
            <Label htmlFor="grewUpIn">Where you grew up</Label>
            <Input
              id="grewUpIn"
              name="grewUpIn"
              value={grewUpIn}
              onChange={(event) => setGrewUpIn(event.target.value)}
              placeholder="Compton, California"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              For a lot of students this is the line that changes the room.
            </p>
          </div>
        </div>
      </section>

      <section hidden={stepped && step !== 1}>
        <h2 className="text-lg font-semibold" hidden={stepped}>
          Your story
        </h2>
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
            value={story}
            onChange={(event) => setStory(event.target.value)}
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
            value={wishIHadKnown}
            onChange={(event) => setWishIHadKnown(event.target.value)}
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
              value={routeIn}
              onChange={(event) => setRouteIn(event.target.value)}
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
              value={firstInFamily}
              onChange={(event) => setFirstInFamily(event.target.value)}
              className={field}
            >
              <option value="">Prefer not to say</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </section>

      <section hidden={stepped && step !== 2}>
        <h2 className="text-lg font-semibold" hidden={stepped}>
          Where you belong
        </h2>
        <p className="text-muted-foreground mt-1 text-sm text-pretty">
          Shown to students as &ldquo;a member of …&rdquo;. Tick any that are
          yours — for a student who has never seen a pilot who looks like them,
          this is often the most useful thing on the page.
        </p>

        <fieldset className="mt-4">
          <legend className="sr-only">Affiliations</legend>
          <div className="grid gap-2">
            {affiliations.map((affiliation) => (
              <label
                key={affiliation.slug}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  name="affiliations"
                  value={affiliation.slug}
                  checked={chosen.includes(affiliation.slug)}
                  onChange={() => toggleAffiliation(affiliation.slug)}
                  className="size-4"
                />
                {/* Full name first, acronym after. A student does not know what
                    OBAP stands for, and an affiliation they cannot decode tells
                    them nothing — which defeats the whole point of it. */}
                <span>
                  {affiliation.longName}
                  {affiliation.name !== affiliation.longName ? (
                    <span className="text-muted-foreground">
                      {" "}
                      ({affiliation.name})
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              name="isCfi"
              checked={isCfi}
              onChange={(event) => setIsCfi(event.target.checked)}
              className="mt-0.5 size-4"
            />
            <span>
              I am a flight instructor
              <span className="text-muted-foreground mt-1 block text-xs text-pretty">
                We are looking for CFIs to check our questions and quiz cards
                before students see them. Ticking this only tells us — we would
                ask you first, and access is something we switch on by hand.
              </span>
            </span>
          </label>
          <div>
            <Label htmlFor="certificateNumber">
              Your FAA certificate number (optional)
            </Label>
            <Input
              id="certificateNumber"
              name="certificateNumber"
              value={certificateNumber}
              onChange={(event) => setCertificateNumber(event.target.value)}
              placeholder="1234567"
            />
            <p className="text-muted-foreground mt-1 text-xs text-pretty">
              The number itself, not your name — so we can look it up in the FAA
              airman registry.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="languages">Languages you can present in</Label>
          <Input
            id="languages"
            name="languages"
            value={languages}
            onChange={(event) => setLanguages(event.target.value)}
            placeholder="English, Spanish"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Separated by commas.
          </p>
        </div>
      </section>

      <section hidden={stepped && step !== 3}>
        <h2 className="text-lg font-semibold" hidden={stepped}>
          Which classrooms you can reach
        </h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="homeCity">City you are based in</Label>
            <Input
              id="homeCity"
              name="homeCity"
              value={homeCity}
              onChange={(event) => setHomeCity(event.target.value)}
              placeholder="Long Beach"
            />
          </div>
          <div>
            <Label htmlFor="homeState">State</Label>
            <Input
              id="homeState"
              name="homeState"
              maxLength={2}
              value={homeState}
              onChange={(event) => setHomeState(event.target.value)}
              placeholder="CA"
            />
          </div>
          <div>
            <Label htmlFor="homeAirport">Home airport (optional)</Label>
            <Input
              id="homeAirport"
              name="homeAirport"
              maxLength={4}
              value={homeAirport}
              onChange={(event) => setHomeAirport(event.target.value)}
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
              value={travelRadius}
              onChange={(event) => setTravelRadius(event.target.value)}
              placeholder="50"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="willDoVirtual"
            checked={willDoVirtual}
            onChange={(event) => setWillDoVirtual(event.target.checked)}
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

      {stepped ? (
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((current) => current - 1)}
            >
              Back
            </Button>
          ) : null}

          {step < STEPS.length - 1 ? (
            <>
              <Button
                type="button"
                onClick={() => setStep((current) => current + 1)}
                disabled={step === 0 && !firstStepReady}
              >
                Continue
              </Button>
              {step === 0 && !firstStepReady ? (
                <span className="text-muted-foreground text-xs text-pretty">
                  Your name and what you fly, and you can carry on.
                </span>
              ) : null}
            </>
          ) : (
            <SaveButton isNew />
          )}
        </div>
      ) : (
        <div>
          <SaveButton isNew={false} />
        </div>
      )}
    </form>
  );
}
