import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata = {
  title: "Dashboard — PilotPathway.ai",
};

export default async function DashboardPage() {
  if (!getSupabaseEnv()) {
    redirect("/login");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">
            PilotPathway.ai
          </span>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Welcome</h1>
        <p className="text-muted-foreground mt-2 text-sm">{user.email}</p>

        <div className="border-border bg-card mt-10 rounded-lg border p-6">
          <span className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">
            Stage 1
          </span>
          <h2 className="mt-2 text-lg font-semibold">Foundations &amp; Pre-Solo</h2>
          <p className="text-muted-foreground mt-2 text-sm text-pretty">
            Your ground school starts here. Lessons and your AI flight
            instructor are next up in the build.
          </p>
        </div>
      </div>
    </main>
  );
}
