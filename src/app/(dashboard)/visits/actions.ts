"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  cancelVisit,
  completeVisit,
  confirmVisit,
  requestVisit,
  volunteerForVisit,
  withdrawFromVisit,
} from "@/lib/visits";
import type { AuthState } from "@/app/(auth)/actions";

const GRADES = ["k_5", "6_8", "9_12", "mixed", "college"] as const;
const FORMATS = ["in_person", "virtual"] as const;

function trimmed(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

/**
 * Every action here passes the failure through in the database's own words.
 *
 * Those messages were written for the person reading them — "that pilot has not
 * been cleared for a classroom yet", "only staff of that school can record what
 * happened" — and each one says what to do next. Replacing them with something
 * vaguer would lose that.
 */
async function withUser<T>(
  run: (
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
  ) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please log in again." };
  }

  try {
    return { ok: true, value: await run(supabase, user.id) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Visit action failed:", { userId: user.id, error: message });
    return { ok: false, error: message };
  }
}

export async function askForVisit(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const organizationId = trimmed(formData, "organizationId");
  const gradeLevel = trimmed(formData, "gradeLevel");
  const format = trimmed(formData, "format");
  const windowStart = trimmed(formData, "windowStart");
  const windowEnd = trimmed(formData, "windowEnd");
  const expected = Number.parseInt(
    String(formData.get("expectedStudents") ?? ""),
    10,
  );

  if (!organizationId || !gradeLevel || !format || !windowStart || !windowEnd) {
    return { error: "Fill in the school, the ages, the format and the dates." };
  }

  if (!(GRADES as readonly string[]).includes(gradeLevel)) {
    return { error: "Pick an age range." };
  }

  if (!(FORMATS as readonly string[]).includes(format)) {
    return {
      error: "Say whether the pilot comes in person or joins by video.",
    };
  }

  if (!Number.isInteger(expected) || expected < 1 || expected > 2000) {
    return { error: "Roughly how many students will be in the room?" };
  }

  if (windowEnd < windowStart) {
    return { error: "The last date cannot be before the first one." };
  }

  const city = trimmed(formData, "city");
  const state = trimmed(formData, "state");

  if (format === "in_person" && (!city || !state)) {
    return {
      error:
        "An in-person visit needs a city and state, so a pilot can tell whether they can reach you.",
    };
  }

  const result = await withUser((supabase) =>
    requestVisit(supabase, {
      organizationId,
      gradeLevel,
      expectedStudents: expected,
      format,
      windowStart,
      windowEnd,
      subject: trimmed(formData, "subject"),
      city,
      state: state ? state.toUpperCase() : null,
      notes: trimmed(formData, "notes"),
    }),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");

  return { message: result.value };
}

export async function offerForVisit(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const visitId = trimmed(formData, "visitId");
  if (!visitId) return { error: "Nothing was recorded." };

  const result = await withUser((supabase) =>
    volunteerForVisit(supabase, visitId, trimmed(formData, "message")),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);

  return { message: result.value };
}

export async function pullOutOfVisit(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const visitId = trimmed(formData, "visitId");
  if (!visitId) return { error: "Nothing was recorded." };

  const result = await withUser((supabase) =>
    withdrawFromVisit(supabase, visitId),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);

  return { message: result.value };
}

export async function pickPilot(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const visitId = trimmed(formData, "visitId");
  const pilot = trimmed(formData, "pilot");
  const when = trimmed(formData, "when");

  if (!visitId || !pilot) return { error: "Nothing was recorded." };

  if (!when) {
    return { error: "Pick the date and time the pilot is coming." };
  }

  const result = await withUser((supabase) =>
    confirmVisit(supabase, visitId, pilot, new Date(when).toISOString()),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);

  return { message: result.value };
}

export async function recordVisitHappened(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const visitId = trimmed(formData, "visitId");
  const attended = Number.parseInt(
    String(formData.get("studentsAttended") ?? ""),
    10,
  );
  const durationRaw = trimmed(formData, "durationMinutes");
  const duration =
    durationRaw === null ? null : Number.parseInt(durationRaw, 10);

  if (!visitId) return { error: "Nothing was recorded." };

  if (!Number.isInteger(attended) || attended < 0 || attended > 2000) {
    return { error: "How many students were actually in the room?" };
  }

  if (
    duration !== null &&
    (!Number.isInteger(duration) || duration < 5 || duration > 480)
  ) {
    return { error: "How long did it run, in minutes?" };
  }

  const result = await withUser((supabase) =>
    completeVisit(supabase, visitId, attended, duration),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);

  return { message: result.value };
}

export async function callOffVisit(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const visitId = trimmed(formData, "visitId");
  if (!visitId) return { error: "Nothing was recorded." };

  const result = await withUser((supabase) =>
    cancelVisit(supabase, visitId, trimmed(formData, "reason")),
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/visits");
  revalidatePath(`/visits/${visitId}`);

  return { message: result.value };
}
