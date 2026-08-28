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

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    return { error: studentFacingError(error.message) };
  }

  // With email confirmation on, Supabase returns a user but no session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
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
