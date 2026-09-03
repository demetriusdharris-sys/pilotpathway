"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv, SUPABASE_SETUP_MESSAGE } from "@/lib/supabase/env";

export type AuthState = {
  error?: string;
  message?: string;
};

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

/**
 * Supabase auth errors are written for developers. A student reading
 * "over_email_send_rate_limit" learns nothing and leaves. Map the ones we
 * actually hit to something they can act on, and fall back to the raw
 * message so an unknown failure is never silent.
 */
function studentFacingError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("rate limit")) {
    return "We couldn't send your confirmation email just now — too many have gone out in the last hour. Wait a few minutes and try again.";
  }
  if (normalized.includes("already registered")) {
    return "That email already has an account. Try logging in instead.";
  }
  if (normalized.includes("invalid") && normalized.includes("email")) {
    return "That email address doesn't look right. Check it and try again.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "That email and password don't match. Check both and try again.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email first — check your inbox for the link we sent.";
  }
  if (normalized.includes("password")) {
    return "That password won't work. Use at least 8 characters.";
  }

  return message;
}

const DATE_OF_BIRTH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const IMPLAUSIBLE_DATE_OF_BIRTH =
  "That date doesn't look right. Use the date picker.";

/**
 * Returns a student-facing error, or undefined when the date of birth clears
 * the 13+ gate.
 *
 * Every comparison here is on the year / month / day integers. Handing the
 * string to `new Date()` would parse it as UTC midnight, which is the previous
 * calendar day everywhere west of Greenwich — California included — so a
 * student who is exactly 13 today would be told they are 12.
 */
function dateOfBirthError(value: string): string | undefined {
  if (!value) {
    return "Enter your date of birth.";
  }
  if (!DATE_OF_BIRTH_PATTERN.test(value)) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  const [year, month, day] = value.split("-").map(Number);

  // Local-time construction, and a round-trip through it rejects dates that
  // match the pattern but do not exist, such as 2010-02-30 or month 13.
  const asDate = new Date(year, month - 1, day);
  if (
    asDate.getFullYear() !== year ||
    asDate.getMonth() !== month - 1 ||
    asDate.getDate() !== day
  ) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  if (year < 1900) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const isFuture =
    year > todayYear ||
    (year === todayYear &&
      (month > todayMonth || (month === todayMonth && day > todayDay)));
  if (isFuture) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  // Has the 13th birthday already arrived, on the same calendar?
  const thirteenthYear = year + 13;
  const hasTurnedThirteen =
    thirteenthYear < todayYear ||
    (thirteenthYear === todayYear &&
      (month < todayMonth || (month === todayMonth && day <= todayDay)));
  if (!hasTurnedThirteen) {
    return "You need to be at least 13 to sign up. Come back when you are — aviation will still be here.";
  }

  return undefined;
}

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  // Only allow same-origin relative paths, never a protocol-relative URL.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function signUp(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!getSupabaseEnv()) {
    return { error: SUPABASE_SETUP_MESSAGE };
  }

  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return { error: "Enter your email and a password to get started." };
  }
  if (password.length < 8) {
    return { error: "Use at least 8 characters for your password." };
  }

  // The age gate is decided here, before any account exists. The browser's
  // min/max on the date input is a convenience, not a control.
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const ageError = dateOfBirthError(dateOfBirth);

  if (ageError) {
    return { error: ageError };
  }

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  // Optional. A student who skips it is not blocked; the tutor is told the
  // name is unknown and simply does not use one.
  const firstName = String(formData.get("firstName") ?? "")
    .trim()
    .slice(0, 60);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        date_of_birth: dateOfBirth,
        ...(firstName ? { first_name: firstName } : {}),
      },
    },
  });

  if (error) {
    return { error: studentFacingError(error.message) };
  }

  // With email confirmation on, Supabase returns a user but no session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }

  // When the address already has an account, Supabase sends no email and
  // returns a decoy user with an empty identities array — deliberate, so the
  // site cannot be probed to discover which emails are registered. It even
  // fills in confirmation_sent_at, so that field cannot be trusted.
  //
  // We must not say "that email is taken" (it would leak exactly what the
  // decoy protects), but we also cannot promise an email that will never
  // arrive. One message covers both cases without stranding anyone.
  const alreadyRegistered = data.user?.identities?.length === 0;

  if (alreadyRegistered) {
    return {
      message: `If ${email} is new here, a confirmation link is on its way. If you already have an account with it, log in below instead.`,
    };
  }

  return {
    message: `Check ${email} for a confirmation link. Open it and you are in.`,
  };
}

export async function logIn(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!getSupabaseEnv()) {
    return { error: SUPABASE_SETUP_MESSAGE };
  }

  const { email, password } = readCredentials(formData);

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: studentFacingError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
