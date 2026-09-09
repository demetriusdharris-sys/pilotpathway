/**
 * SERVER ONLY. Never import this from a "use client" file.
 *
 * RESEND_API_KEY must never be prefixed NEXT_PUBLIC_. A Resend key in a client
 * bundle lets anyone who views source send mail as pilotpathway.ai — which
 * costs the domain's sending reputation and, worse, lets someone impersonate
 * us to a student or a parent.
 *
 * Resend is separately configured as Supabase's SMTP provider, which is how
 * confirmation and password-reset mail goes out. That path is composed and
 * sent by Supabase and needs no key here. This path is for application email
 * only — mail the product itself decides to send, such as a guardian invite,
 * which Supabase Auth has no concept of.
 */

export const EMAIL_FROM = "PilotPathway <noreply@pilotpathway.ai>";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * What callers are allowed to see. The provider's own error text is logged
 * server-side and never returned: it can quote the recipient address, echo
 * message content, or describe our account state, none of which belongs in
 * something a student or a parent might end up reading on screen.
 */
const GENERIC_FAILURE = "That email could not be sent. Try again shortly.";

export type SendEmailParams = {
  to: string;
  subject: string;
  /** Both bodies are required. */
  html: string;
  /**
   * Plain-text fallback. Not optional: our students are on cheap phones and
   * limited data, some on clients that never render HTML, and an HTML-only
   * message scores worse with spam filters — an invite in a spam folder is an
   * invite that did not arrive.
   */
  text: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

/**
 * Sends one email through Resend.
 *
 * Never throws. Fails closed the same way createAdminClient does: a missing
 * key is a configuration problem, not a runtime crash, and a caller that
 * cannot send mail should be able to carry on and report it rather than take
 * down the request it was serving.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("RESEND_API_KEY is not set — no email was sent.", {
      to,
      subject,
    });
    return { ok: false, error: GENERIC_FAILURE };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      // Read as text rather than JSON: an error body is not guaranteed to be
      // JSON, and this value is only ever logged, never parsed or returned.
      const detail = await response
        .text()
        .catch(() => "<response body could not be read>");

      console.error("Resend rejected an email:", {
        to,
        subject,
        status: response.status,
        detail,
      });

      return { ok: false, error: GENERIC_FAILURE };
    }

    return { ok: true };
  } catch (error) {
    // Network failure, DNS, timeout, aborted connection.
    console.error("Resend request failed:", {
      to,
      subject,
      error: error instanceof Error ? error.message : String(error),
    });

    return { ok: false, error: GENERIC_FAILURE };
  }
}
