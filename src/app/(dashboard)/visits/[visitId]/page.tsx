import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadStaffOrganizations } from "@/lib/school-roster";
import { loadOwnPilotProfile } from "@/lib/pilots";
import {
  GRADE_LABEL,
  STATUS_LABEL,
  hasOffered,
  loadOffers,
  loadSignupCounts,
  loadVisit,
} from "@/lib/visits";
import {
  CancelVisitForm,
  OfferForm,
  PickPilotForm,
  RecordVisitForm,
} from "@/components/visit-forms";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "A classroom visit — PilotPathway.ai",
};

export default async function VisitPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  if (!getSupabaseEnv()) redirect("/login");

  const { visitId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/visits/${visitId}`);

  const visit = await loadVisit(supabase, visitId);

  // RLS already decided whether this row is visible, so "not found" and "not
  // yours" are the same answer — which is also the answer that reveals least.
  if (!visit) notFound();

  const [organizations, pilot, offers, signupCounts] = await Promise.all([
    loadStaffOrganizations(supabase, user.id).catch(() => []),
    loadOwnPilotProfile(supabase, user.id).catch(() => null),
    loadOffers(supabase, visitId).catch(() => []),
    loadSignupCounts(supabase, [visitId]),
  ]);

  const signups = signupCounts.get(visitId) ?? 0;

  const isStaffHere = organizations.some(
    (org) => org.organizationId === visit.organizationId,
  );
  const isVerifiedPilot = pilot?.vettingStatus === "verified";
  const isTheirVisit = visit.pilotUserId === user.id;
  const offered = isVerifiedPilot
    ? await hasOffered(supabase, visitId, user.id).catch(() => false)
    : false;

  const where =
    visit.format === "virtual"
      ? "By video"
      : [visit.city, visit.state].filter(Boolean).join(", ") || "In person";

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/visits"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            Classroom visits
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <span
          className={`text-xs font-semibold tracking-[0.15em] uppercase ${
            visit.status === "open"
              ? "text-gold-strong"
              : "text-muted-foreground"
          }`}
        >
          {STATUS_LABEL[visit.status] ?? visit.status}
        </span>
        <h1 className="mt-1 text-3xl font-semibold">
          {visit.organizationName ?? "A school"}
        </h1>

        <dl className="mt-6 flex flex-col gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Ages</dt>
            <dd>{GRADE_LABEL[visit.gradeLevel] ?? visit.gradeLevel}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Students expected</dt>
            <dd className="tabular-nums">{visit.expectedStudents}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">Where</dt>
            <dd>{where}</dd>
          </div>
          {visit.subject ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Class or occasion</dt>
              <dd>{visit.subject}</dd>
            </div>
          ) : null}
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-muted-foreground">
              {visit.confirmedFor ? "Confirmed for" : "Any time between"}
            </dt>
            <dd>
              {visit.confirmedFor
                ? visit.confirmedFor.slice(0, 16).replace("T", " ")
                : `${visit.windowStart} and ${visit.windowEnd}`}
            </dd>
          </div>
          {visit.pilotName ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Pilot</dt>
              <dd>{visit.pilotName}</dd>
            </div>
          ) : null}
          {visit.status === "completed" ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Students who came</dt>
              <dd className="tabular-nums">
                {visit.studentsAttended}
                {visit.durationMinutes ? ` · ${visit.durationMinutes} min` : ""}
              </dd>
            </div>
          ) : null}
          {visit.cancelledReason ? (
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">Called off because</dt>
              <dd>{visit.cancelledReason}</dd>
            </div>
          ) : null}
        </dl>

        {/* The code, for whoever is standing in front of the class. Shown to the
            school and the pilot only — it is not secret, but it belongs to the
            people running the visit. */}
        {visit.code && (isStaffHere || isTheirVisit) ? (
          <section className="border-gold/40 bg-gold/10 mt-6 rounded-lg border p-5">
            <h2 className="font-semibold">Put this on the last slide</h2>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.2em]">
              {visit.code}
            </p>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              Or send them to{" "}
              <span className="text-foreground font-medium">
                pilotpathway.vercel.app/j/{visit.code}
              </span>
              , where they will see who visited them before they sign up.
            </p>
            <p className="text-muted-foreground mt-2 text-xs text-pretty">
              It records which visit reached a student. It is not a key — the
              ground school is free with or without it, and typing it gives this
              school no view of their progress.
            </p>
            {signups > 0 ? (
              <p className="mt-3 text-sm font-medium">
                {signups} student{signups === 1 ? " has" : "s have"} signed up
                from this visit.
              </p>
            ) : null}
          </section>
        ) : null}

        {visit.notes ? (
          <p className="border-border mt-6 border-l-2 pl-4 text-sm text-pretty">
            {visit.notes}
          </p>
        ) : null}

        {/* --- A pilot's side ------------------------------------------- */}
        {isVerifiedPilot && (visit.status === "open" || isTheirVisit) ? (
          <section className="border-border bg-card mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">
              {isTheirVisit ? "You are booked for this" : "Take this one"}
            </h2>
            {isTheirVisit ? (
              <p className="text-muted-foreground mt-1 text-sm text-pretty">
                The school is expecting you. If something changes, withdraw here
                rather than leaving a classroom waiting.
              </p>
            ) : null}
            <OfferForm visitId={visit.id} offered={offered || isTheirVisit} />
          </section>
        ) : null}

        {/* --- The school's side --------------------------------------- */}
        {isStaffHere && visit.status === "open" ? (
          <section className="border-border bg-card mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">
              Pilots who have offered{" "}
              <span className="text-muted-foreground tabular-nums">
                {offers.length}
              </span>
            </h2>

            {offers.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-sm text-pretty">
                Nobody yet. Pilots see this as soon as it is posted, and a wider
                date window reaches more of them.
              </p>
            ) : (
              <>
                <ul className="mt-4 flex flex-col gap-3">
                  {offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="border-border rounded-md border p-3"
                    >
                      <p className="font-medium">
                        {offer.pilotName ?? "A pilot"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {offer.pilotJobTitle ?? ""}
                        {offer.pilotGrewUpIn
                          ? ` · grew up in ${offer.pilotGrewUpIn}`
                          : ""}
                      </p>
                      {offer.message ? (
                        <p className="mt-2 text-sm text-pretty">
                          {offer.message}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <PickPilotForm visitId={visit.id} offers={offers} />
              </>
            )}
          </section>
        ) : null}

        {isStaffHere && visit.status === "confirmed" ? (
          <section className="border-border bg-card mt-8 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">After it happens</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Come back once the pilot has been, and tell us how it went.
            </p>
            <RecordVisitForm visitId={visit.id} />
          </section>
        ) : null}

        {(isStaffHere || isTheirVisit) &&
        visit.status !== "completed" &&
        visit.status !== "cancelled" ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
              Call it off
            </h2>
            <CancelVisitForm visitId={visit.id} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
