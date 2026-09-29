import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadAffiliations, loadOwnPilotProfile } from "@/lib/pilots";
import { PilotProfileForm } from "@/components/pilot-profile-form";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Your pilot profile — PilotPathway.ai",
};

const STATUS_COPY: Record<string, { heading: string; body: string }> = {
  unverified: {
    heading: "Not yet cleared for a classroom",
    body: "Fill this in and we will start a background check. Schools only see pilots who have been checked — the FAA vets your flying, not your fitness to work with children, so we do that separately.",
  },
  pending: {
    heading: "Background check in progress",
    body: "We have your profile and the check is underway. Nothing else is needed from you yet.",
  },
  verified: {
    heading: "Cleared for classrooms",
    body: "Schools can see your profile and ask for you. You can change anything here at any time.",
  },
  declined: {
    heading: "Not cleared",
    body: "We are not able to place you in a classroom at the moment. If you think this is a mistake, email demetrius@pilotpathway.ai.",
  },
};

export default async function PilotPage() {
  if (!getSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/pilot");

  const [profile, affiliations] = await Promise.all([
    loadOwnPilotProfile(supabase, user.id),
    loadAffiliations(supabase),
  ]);

  const status = STATUS_COPY[profile?.vettingStatus ?? "unverified"];

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            PilotPathway.ai
          </Link>
          {/* No link to the student dashboard. A pilot is not taking the
              ground school, and offering them a page of Stage 1 lessons
              suggests they should be. */}
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          For pilot mentors
        </span>
        <h1 className="mt-1 text-3xl font-semibold">
          {profile ? "Your pilot profile" : "Volunteer in a classroom"}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          You spend forty-five minutes in a room. Some of those students have
          never met a pilot, and a few of them will decide something about
          themselves that day.
        </p>

        {/* Status before the form, because what a pilot wants to know first is
            whether they can actually be sent anywhere. */}
        <section
          className={`mt-6 rounded-lg border p-5 ${
            profile?.vettingStatus === "verified"
              ? "border-border bg-card"
              : "border-gold/40 bg-gold/10"
          }`}
        >
          <h2 className="font-semibold">{status.heading}</h2>
          <p className="mt-2 text-sm text-pretty">{status.body}</p>
          {profile?.vettingStatus === "verified" && profile.vettedBy ? (
            <p className="text-muted-foreground mt-2 text-xs">
              Checked by {profile.vettedBy}
              {profile.vettedAt ? ` on ${profile.vettedAt.slice(0, 10)}` : ""}
              {profile.vettingExpiresAt
                ? `, due again ${profile.vettingExpiresAt}`
                : ""}
              .
            </p>
          ) : null}
        </section>

        <PilotProfileForm profile={profile} affiliations={affiliations} />
      </div>
    </main>
  );
}
