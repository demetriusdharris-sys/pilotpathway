import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import {
  ADULT_AGE_YEARS,
  hasReachedAge,
  maxDateOfBirth,
} from "@/lib/date-of-birth";
import { loadGuardianLinks, type GuardianLink } from "@/lib/guardian-links";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileForm } from "@/components/profile-form";
import { GuardianInviteForm } from "@/components/guardian-invite-form";

/**
 * Rendered as the stored `YYYY-MM-DD`-style value rather than a localised
 * date. Formatting a date in a client component risks a hydration mismatch,
 * and formatting it here would still be a second date format to keep straight.
 */
function expiryLine(link: GuardianLink): string | null {
  if (!link.tokenExpiresAt) {
    return null;
  }
  const day = link.tokenExpiresAt.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function GuardianSection({
  dateOfBirth,
  links,
}: {
  dateOfBirth: string | null;
  links: GuardianLink[];
}) {
  // An adult does not need a guardian on file, so nothing is rendered at all.
  // Age is computed here from the stored date rather than by calling
  // is_adult() -- one round trip saved, and the same fail-closed rule.
  if (hasReachedAge(dateOfBirth, ADULT_AGE_YEARS)) {
    return null;
  }

  const heading = (
    <>
      <span className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">
        Parent or guardian
      </span>
      <h2 className="mt-1 text-xl font-semibold">Who approves your account</h2>
    </>
  );

  if (dateOfBirth === null) {
    return (
      <section className="border-border bg-card mt-8 rounded-lg border p-6">
        {heading}
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          Add your date of birth above and we will know whether a parent or
          guardian needs to approve some features for you. Ground school itself
          stays open either way.
        </p>
      </section>
    );
  }

  const verified = links.find((link) => link.status === "verified");
  const pending = links.find((link) => link.status === "pending");

  return (
    <section className="border-border bg-card mt-8 rounded-lg border p-6">
      {heading}

      {verified ? (
        <>
          <p className="text-muted-foreground mt-3 text-sm text-pretty">
            Confirmed. Everything that needs a guardian&apos;s approval is
            available to you.
          </p>
          <p className="border-border bg-muted/40 text-foreground mt-4 rounded-md border px-3 py-2 text-sm">
            {verified.invitedEmail ?? "Your guardian"}
          </p>
        </>
      ) : pending ? (
        <>
          <p className="text-muted-foreground mt-3 text-sm text-pretty">
            We have sent them a link to confirm. Nothing is holding up your
            lessons while you wait.
          </p>
          <p className="border-border bg-muted/40 text-foreground mt-4 rounded-md border px-3 py-2 text-sm">
            {pending.invitedEmail ?? "Invite sent"}
          </p>
          <p className="text-muted-foreground mt-2 text-xs text-pretty">
            Waiting for them to confirm
            {expiryLine(pending) ? ` — the link works until ${expiryLine(pending)}` : ""}
            . If it has not arrived, check their spam folder and then resend.
          </p>
          {pending.invitedEmail ? (
            <GuardianInviteForm
              fixedEmail={pending.invitedEmail}
              submitLabel="Resend invite"
              pendingLabel="Resending…"
            />
          ) : null}
        </>
      ) : (
        <>
          <p className="text-muted-foreground mt-3 text-sm text-pretty">
            Because you are under 18, a parent or guardian confirms a few things
            for you — live sessions with an instructor, and anything shared with
            a school or sponsor. Ground school itself is open to you now.
          </p>
          <GuardianInviteForm
            submitLabel="Send invite"
            pendingLabel="Sending…"
          />
        </>
      )}
    </section>
  );
}

export const metadata = {
  title: "Your profile — PilotPathway.ai",
};

export default async function ProfilePage() {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profile");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  const firstName =
    typeof profile?.first_name === "string" ? profile.first_name : null;
  const dateOfBirth =
    typeof profile?.date_of_birth === "string" ? profile.date_of_birth : null;

  const guardianLinks = await loadGuardianLinks(supabase, user.id);

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

      <div className="mx-auto w-full max-w-2xl px-6 py-12">
        <span className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">
          Your account
        </span>
        <h1 className="mt-1 text-3xl font-semibold">Profile</h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          What we know about you, and the parts you can change.
        </p>

        <section className="border-border bg-card mt-10 rounded-lg border p-6">
          <ProfileForm
            firstName={firstName}
            dateOfBirth={dateOfBirth}
            email={user.email ?? ""}
            // Computed here, on the server. Never inside the client component.
            maxDateOfBirth={dateOfBirth === null ? maxDateOfBirth() : undefined}
          />
        </section>

        <GuardianSection dateOfBirth={dateOfBirth} links={guardianLinks} />
      </div>
    </main>
  );
}
