import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { loadVisitByCode } from "@/lib/visits";
import { loadAffiliations } from "@/lib/pilots";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "You met a pilot — PilotPathway.ai",
};

/**
 * What a student sees after typing the code off the board.
 *
 * Public on purpose: somebody who met a pilot forty minutes ago has no account,
 * and asking them to make one before showing them anything wastes the only
 * moment that matters. So this reads with the service role and returns nothing
 * but the pilot's own public story.
 *
 * THE CODE IS NOT A KEY. It records where somebody came from. Signing up without
 * one is completely normal and the page says so — the ground school is free to
 * everyone permanently, and a code that unlocked it would make this a paywall.
 */
export default async function VisitCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  if (!getSupabaseEnv()) notFound();

  const admin = createAdminClient();

  if (!admin) notFound();

  const [invitation, affiliations] = await Promise.all([
    loadVisitByCode(admin, code),
    loadAffiliations(admin),
  ]);

  if (!invitation) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const named = new Map(affiliations.map((a) => [a.slug, a.longName]));
  const belongs = invitation.pilotAffiliations
    .map((slug) => named.get(slug))
    .filter((name): name is string => name !== undefined);

  return (
    <main className="bg-primary flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="text-gold text-sm font-semibold tracking-[0.2em] uppercase"
        >
          PilotPathway.ai
        </Link>

        <div className="bg-card text-card-foreground border-border mt-5 rounded-lg border p-6 shadow-sm">
          <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
            You met a pilot
          </span>

          <h1 className="mt-1 text-2xl font-semibold text-balance">
            {invitation.pilotName
              ? `${invitation.pilotName} came to your class`
              : "A pilot came to your class"}
          </h1>

          {invitation.pilotJobTitle ? (
            <p className="text-muted-foreground mt-2 text-sm">
              {invitation.pilotJobTitle}
              {invitation.pilotEmployer ? ` · ${invitation.pilotEmployer}` : ""}
              {invitation.pilotGrewUpIn
                ? ` · grew up in ${invitation.pilotGrewUpIn}`
                : ""}
            </p>
          ) : null}

          {belongs.length > 0 ? (
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              A member of {belongs.join(", ")}.
            </p>
          ) : null}

          {invitation.pilotStory ? (
            <p className="border-border mt-5 border-l-2 pl-4 text-sm text-pretty">
              {invitation.pilotStory}
            </p>
          ) : null}

          {invitation.pilotWishIHadKnown ? (
            <p className="mt-4 text-sm text-pretty">
              <span className="font-medium">
                What they wish they had known at your age:
              </span>{" "}
              {invitation.pilotWishIHadKnown}
            </p>
          ) : null}

          <hr className="border-border my-6" />

          <h2 className="font-semibold">You can start the same way they did</h2>
          <p className="text-muted-foreground mt-2 text-sm text-pretty">
            Free ground school for the Private Pilot written test — the real FAA
            standards, an instructor you can ask anything, and practice tests.
            It stays free.
          </p>

          <div className="mt-5">
            {user ? (
              <Button asChild>
                <Link href={`/dashboard?visit=${invitation.code}`}>
                  Go to your ground school
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href={`/signup?as=student&visit=${invitation.code}`}>
                  Create my free account
                </Link>
              </Button>
            )}
          </div>

          <p className="text-muted-foreground mt-4 text-xs text-pretty">
            The code just tells us which visit reached you, so the people who
            sent {invitation.pilotName ?? "a pilot"} to your school know it
            worked. You can sign up without it and nothing changes.
          </p>
        </div>

        <p className="text-primary-foreground/70 mt-5 text-xs">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
