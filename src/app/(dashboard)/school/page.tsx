import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  loadRoster,
  loadStaffOrganizations,
  type Roster,
} from "@/lib/school-roster";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Your students — PilotPathway.ai",
};

function day(value: string | null): string {
  // Rendered as the stored date rather than a localised one, for the same
  // reason as the guardian invite expiry: a second date format is a second
  // thing to keep straight, and localising on the client risks a mismatch.
  if (!value) return "—";
  const date = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "—";
}

function RosterTable({ roster }: { roster: Roster }) {
  const notSharing = roster.memberCount - roster.students.length;

  return (
    <section className="border-border bg-card mt-8 rounded-lg border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
            {roster.organization.orgType.replace("_", " ")}
          </span>
          <h2 className="mt-1 text-xl font-semibold">
            {roster.organization.name}
          </h2>
        </div>
        <p className="text-muted-foreground text-sm">
          {roster.students.length} of {roster.memberCount} sharing
        </p>
      </div>

      {roster.assessableObjectives === 0 ? (
        <p className="border-gold/40 bg-gold/10 mt-5 rounded-md border p-4 text-sm text-pretty">
          No quiz has been approved for students yet, so there is nothing to
          report against. Progress will appear here once a certificated flight
          instructor has reviewed and approved the quiz cards.
        </p>
      ) : null}

      {roster.students.length === 0 ? (
        <p className="text-muted-foreground mt-5 text-sm text-pretty">
          {roster.memberCount === 0
            ? "No students are enrolled here yet."
            : "No student here is sharing their progress. Each student chooses this for themselves, on their own profile, and can stop at any time."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Students sharing their progress with {roster.organization.name}
            </caption>
            <thead>
              <tr className="border-border border-b text-left">
                <th scope="col" className="py-2 pr-4 font-semibold">
                  Student
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Objectives shown
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">
                  Objectives attempted
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  Last answer
                </th>
              </tr>
            </thead>
            <tbody>
              {roster.students.map((student) => (
                <tr key={student.studentId} className="border-border border-b">
                  <td className="py-3 pr-4">
                    <span className="font-medium">
                      {student.firstName ?? "Student"}
                    </span>
                    {student.email ? (
                      <span className="text-muted-foreground block text-xs">
                        {student.email}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {student.shown}
                    {roster.assessableObjectives > 0 ? (
                      <span className="text-muted-foreground">
                        {" "}
                        of {roster.assessableObjectives}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums">
                    {student.attempted}
                  </td>
                  <td className="text-muted-foreground py-3 text-right tabular-nums">
                    {day(student.lastAssessedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {notSharing > 0 && roster.students.length > 0 ? (
        <p className="text-muted-foreground mt-4 text-xs text-pretty">
          {notSharing === 1
            ? "One other student is enrolled and is not sharing their progress."
            : `${notSharing} other students are enrolled and are not sharing their progress.`}{" "}
          That is their decision to make, and asking them to change it is a
          conversation, not a setting.
        </p>
      ) : null}
    </section>
  );
}

export default async function SchoolPage() {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/school");
  }

  const organizations = await loadStaffOrganizations(supabase, user.id);
  const admin = createAdminClient();

  const rosters: Roster[] = [];

  if (admin) {
    for (const organization of organizations) {
      rosters.push(await loadRoster(supabase, admin, organization));
    }
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.2em] uppercase"
          >
            PilotPathway.ai
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-muted-foreground hover:text-foreground text-sm font-medium underline-offset-4 hover:underline"
            >
              Dashboard
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
          For school staff
        </span>
        <h1 className="mt-1 text-3xl font-semibold">Your students</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          Progress a student has chosen to share with you. Quiz results only —
          conversations with Captain Path are never shared with anyone.
        </p>

        {organizations.length === 0 ? (
          <section className="border-border bg-card mt-10 rounded-lg border p-6">
            <h2 className="font-semibold">Nothing here for this account</h2>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              This page is for staff at a school or flight school. Your account
              is not staff of one, so there is nothing to show.
            </p>
          </section>
        ) : !admin ? (
          <section className="border-border bg-card mt-10 rounded-lg border p-6">
            <h2 className="font-semibold">This page is not available</h2>
            <p className="text-muted-foreground mt-2 text-sm text-pretty">
              This is on our side, not yours. Nothing about your students has
              changed. Try again shortly.
            </p>
          </section>
        ) : (
          rosters.map((roster) => (
            <RosterTable
              key={roster.organization.organizationId}
              roster={roster}
            />
          ))
        )}
      </div>
    </main>
  );
}
