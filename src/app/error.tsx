"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * What a student sees when something breaks.
 *
 * The reference code is the point. Next stamps every server-side error with a
 * `digest` and writes the same value into the server log, so a student who
 * quotes it lets us find the exact failure — which matters because Vercel
 * keeps runtime logs only briefly and nobody is watching them live. Without
 * it, "it broke yesterday" is unsearchable.
 *
 * It deliberately does not say what went wrong. We do not know yet, and a
 * guess would send the student chasing their own connection or their own
 * account when the fault is ours.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side errors never reach the server log on their own.
    console.error("Unhandled error:", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground mt-3 text-sm text-pretty">
          This is on our side, not yours. Nothing you have done has been lost —
          your progress and your conversations are saved.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="text-muted-foreground mt-6 text-sm text-pretty">
            If it keeps happening, email{" "}
            <a
              href="mailto:demetrius@pilotpathway.ai"
              className="text-foreground font-medium underline"
            >
              demetrius@pilotpathway.ai
            </a>{" "}
            and quote this reference — it is how we find what happened:
            <br />
            <code className="bg-muted mt-2 inline-block rounded px-2 py-1 text-xs">
              {error.digest}
            </code>
          </p>
        ) : (
          <p className="text-muted-foreground mt-6 text-sm text-pretty">
            If it keeps happening, email{" "}
            <a
              href="mailto:demetrius@pilotpathway.ai"
              className="text-foreground font-medium underline"
            >
              demetrius@pilotpathway.ai
            </a>{" "}
            and tell us what you were doing when it broke.
          </p>
        )}
      </div>
    </main>
  );
}
