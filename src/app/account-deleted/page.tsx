import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Account deleted — PilotPathway.ai",
};

/**
 * Where a student lands after deleting their account. Public on purpose: the
 * session is gone by the time they arrive here.
 */
export default function AccountDeletedPage() {
  return (
    <main className="bg-primary flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-gold text-sm font-semibold tracking-[0.2em] uppercase"
        >
          PilotPathway.ai
        </Link>
        <div className="bg-card text-card-foreground border-border mt-5 flex flex-col gap-4 rounded-lg border p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">Your account is deleted</h1>
          <p className="text-muted-foreground text-sm text-pretty">
            Your profile, progress, instructor conversations, and quiz answers
            have been removed from our database.
          </p>
          <p className="text-muted-foreground text-sm text-pretty">
            Thank you for flying with us. If you ever want to come back, you are
            welcome to start again.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to PilotPathway</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
