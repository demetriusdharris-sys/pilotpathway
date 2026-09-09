import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { maxDateOfBirth } from "@/lib/date-of-birth";
import { SignOutButton } from "@/components/sign-out-button";
import { ProfileForm } from "@/components/profile-form";

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
      </div>
    </main>
  );
}
