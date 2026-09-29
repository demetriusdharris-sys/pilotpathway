import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadStaffOrganizations } from "@/lib/school-roster";
import { loadOwnPilotProfile } from "@/lib/pilots";
import {
  GRADE_LABEL,
  STATUS_LABEL,
  loadVisits,
  type ClassroomVisit,
} from "@/lib/visits";
import { RequestVisitForm } from "@/components/visit-forms";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Classroom visits — PilotPathway.ai",
};

function VisitRow({ visit }: { visit: ClassroomVisit }) {
  const where =
    visit.format === "virtual"
      ? "By video"
      : [visit.city, visit.state].filter(Boolean).join(", ") || "In person";

  return (
    <li className="border-border rounded-md border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link
          href={`/visits/${visit.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {visit.organizationName ?? "A school"}
        </Link>
        <span
          className={`text-xs font-semibold tracking-[0.08em] uppercase ${
            visit.status === "open"
              ? "text-gold-strong"
              : "text-muted-foreground"
          }`}
        >
          {STATUS_LABEL[visit.status] ?? visit.status}
        </span>
      </div>

      <p className="text-muted-foreground mt-1 text-sm text-pretty">
        {GRADE_LABEL[visit.gradeLevel] ?? visit.gradeLevel} ·{" "}
        {visit.expectedStudents} students · {where}
        {visit.subject ? ` · ${visit.subject}` : ""}
      </p>

      <p className="text-muted-foreground mt-1 text-xs">
        {visit.status === "confirmed" && visit.confirmedFor
          ? `${visit.pilotName ?? "A pilot"} — ${visit.confirmedFor.slice(0, 16).replace("T", " ")}`
          : visit.status === "completed"
            ? `${visit.pilotName ?? "A pilot"} · ${visit.studentsAttended} students came`
            : `Any time between ${visit.windowStart} and ${visit.windowEnd}`}
        {visit.status === "open" && visit.volunteerCount > 0
          ? ` · ${visit.volunteerCount} pilot${visit.volunteerCount === 1 ? "" : "s"} offered`
          : ""}
      </p>
    </li>
  );
}

export default async function VisitsPage() {
  if (!getSupabaseEnv()) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/visits");

  const [organizations, pilot, visits] = await Promise.all([
    loadStaffOrganizations(supabase, user.id).catch(() => []),
    loadOwnPilotProfile(supabase, user.id).catch(() => null),
    loadVisits(supabase),
  ]);

  const isStaff = organizations.length > 0;
  const isVerifiedPilot = pilot?.vettingStatus === "verified";

  // Neither a school nor a cleared pilot: there is nothing here, and saying so
  // plainly beats an empty page that looks broken.
  if (!isStaff && !pilot) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-2xl font-semibold">
          Nothing here for this account
        </h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Classroom visits are for schools asking for a pilot, and for pilots
          volunteering to go. If you are a teacher and your school is not set up
          yet, email demetrius@pilotpathway.ai.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block font-medium underline underline-offset-4"
        >
          Back to the dashboard
        </Link>
      </main>
    );
  }

  const open = visits.filter((visit) => visit.status === "open");
  const upcoming = visits.filter((visit) => visit.status === "confirmed");
  const past = visits.filter(
    (visit) => visit.status === "completed" || visit.status === "cancelled",
  );

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
          <div className="flex items-center gap-4">
            {pilot ? (
              <Link
                href="/pilot"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Your profile
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
              >
                Dashboard
              </Link>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Classroom visits</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          {isStaff
            ? "Ask for a working pilot to come and talk to your students. Every pilot here has had a background check."
            : "Classrooms that have asked for a pilot. Some of these students have never met one."}
        </p>

        {/* A pilot who has not been cleared cannot volunteer, so say why rather
            than showing them a list of things they cannot do. */}
        {pilot && !isVerifiedPilot ? (
          <section className="border-gold/40 bg-gold/10 mt-6 rounded-lg border p-5">
            <h2 className="font-semibold">Not cleared for a classroom yet</h2>
            <p className="mt-2 text-sm text-pretty">
              You will see classrooms asking for a pilot once your background
              check is on record.{" "}
              <Link
                href="/pilot"
                className="font-medium underline underline-offset-4"
              >
                Your profile
              </Link>{" "}
              says where that stands.
            </p>
          </section>
        ) : null}

        {isStaff ? (
          <section className="border-border bg-card mt-6 rounded-lg border p-6">
            <h2 className="text-xl font-semibold">Ask for a pilot</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Say when you are free rather than picking a date — a working pilot
              flies for a living, and a window gets you somebody.
            </p>
            <RequestVisitForm
              organizations={organizations.map((org) => ({
                id: org.organizationId,
                name: org.name,
              }))}
            />
          </section>
        ) : null}

        {open.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
              {isStaff
                ? "Waiting for a pilot"
                : "Classrooms looking for a pilot"}
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {open.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </section>
        ) : null}

        {upcoming.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
              Coming up
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {upcoming.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </section>
        ) : null}

        {past.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
              Already happened
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              {past.map((visit) => (
                <VisitRow key={visit.id} visit={visit} />
              ))}
            </ul>
          </section>
        ) : null}

        {visits.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-sm text-pretty">
            {isStaff
              ? "No visits yet. Ask for one above."
              : "No classroom has asked for a pilot yet. This is where they will appear."}
          </p>
        ) : null}
      </div>
    </main>
  );
}
