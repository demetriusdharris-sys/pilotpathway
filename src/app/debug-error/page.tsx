/**
 * TEMPORARY. Exists only to prove the error page works on the live site, and
 * is deleted in the next commit. Standing rule 1: a page nobody has seen fail
 * is not a page known to handle failure.
 *
 * force-dynamic because a page that throws during the build fails the build
 * rather than the request — this has to fail when a person opens it.
 */
export const dynamic = "force-dynamic";

export default function DebugErrorPage() {
  throw new Error("Deliberate test error — proving the error page renders.");
}
