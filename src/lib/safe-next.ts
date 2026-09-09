/**
 * Validates a post-auth redirect target.
 *
 * Lives here rather than in the auth actions because a "use server" module may
 * only export async functions, and the callback route needs this too. One copy
 * is the point: an open-redirect check that exists twice is a check that gets
 * fixed once.
 *
 * Only same-origin relative paths are allowed. A protocol-relative value like
 * `//evil.example` is a fully qualified URL to a browser, which is how an
 * attacker turns a confirmation link into a redirect to a page they control.
 */
export const DEFAULT_NEXT = "/dashboard";

export function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_NEXT;
}
