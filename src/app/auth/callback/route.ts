import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { safeNext } from "@/lib/safe-next";
import { claimVisitCode } from "@/lib/visits";

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && OTP_TYPES.includes(value as EmailOtpType);
}

/**
 * Records which classroom visit brought this student, once, right after their
 * account is confirmed.
 *
 * Here rather than on the dashboard because this runs exactly once and there is
 * a session by the time it does. Best-effort throughout: a bad code, a cancelled
 * visit or an unreachable table must never stop somebody confirming their
 * account. The worst case is a sponsor count one lower than the truth, which is
 * a great deal better than a student locked out over an attribution.
 */
async function claimVisitIfAny(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const code = user?.user_metadata?.signup_visit_code;

    if (typeof code !== "string" || code.length === 0) return;

    await claimVisitCode(supabase, code);
  } catch (error) {
    console.error("Could not attribute a signup to a visit:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  // Set by signUp on the confirmation link. Same validator the auth actions
  // use -- this must never become a second, divergent copy.
  const next = safeNext(searchParams.get("next"));

  const fail = (reason: string) =>
    NextResponse.redirect(`${origin}/login?error=${reason}`);

  if (!getSupabaseEnv()) {
    return fail("not_configured");
  }

  const supabase = await createClient();

  // Supabase sends one of two link shapes depending on the email template:
  // a PKCE `code`, or a `token_hash` + `type` pair. Support both so the
  // confirmation link works either way.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail("auth_failed");
    await claimVisitIfAny(supabase);
    return NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return fail("auth_failed");
    await claimVisitIfAny(supabase);
    return NextResponse.redirect(`${origin}${next}`);
  }

  return fail("missing_code");
}
