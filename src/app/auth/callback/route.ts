import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

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

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;

  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/dashboard";

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
    return error ? fail("auth_failed") : NextResponse.redirect(`${origin}${next}`);
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    return error ? fail("auth_failed") : NextResponse.redirect(`${origin}${next}`);
  }

  return fail("missing_code");
}
