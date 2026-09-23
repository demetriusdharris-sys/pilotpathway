import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Not found — PilotPathway.ai",
};

/**
 * Also reached by `notFound()` from the lesson page, where the honest cause is
 * usually a mistyped or stale URL rather than anything the student did wrong.
 */
export default function NotFoundPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">We can&apos;t find that page</h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          The link may be out of date, or the address may have a typo in it.
          Nothing is wrong with your account.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contact">Tell us about it</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
