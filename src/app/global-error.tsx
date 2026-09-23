"use client";

/**
 * The last resort: an error in the root layout itself, where the normal error
 * page cannot render because the layout it lives inside is what failed. It
 * must bring its own html and body, and must not import anything that could
 * be part of the failure — so no shared components and no styles beyond
 * inline ones.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          margin: 0,
          padding: "3rem 1.5rem",
          color: "#1a1a1a",
          background: "#fff",
        }}
      >
        <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
            PilotPathway is having a problem
          </h1>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.6 }}>
            This is on our side. Your progress is saved. Reload the page in a
            moment, and if it keeps happening email{" "}
            <a href="mailto:demetrius@pilotpathway.ai">
              demetrius@pilotpathway.ai
            </a>
            {error.digest ? ` and quote this reference: ${error.digest}` : "."}
          </p>
          <p>
            {/* A plain anchor on purpose: next/link needs the router, and the
                router lives inside the layout that just failed. A full page
                load is the only navigation that can be relied on here. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Back to the home page</a>
          </p>
        </div>
      </body>
    </html>
  );
}
