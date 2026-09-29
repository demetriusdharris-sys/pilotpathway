"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  loadOwnPilotProfile,
  savePilotProfile,
  type PilotUpsert,
} from "@/lib/pilots";
import type { AuthState } from "@/app/(auth)/actions";

const ROUTES = [
  "military",
  "community_college",
  "university",
  "flight_school_self_funded",
  "airline_cadet",
  "family_business",
  "other",
] as const;

const AFFILIATIONS = [
  "obap",
  "sots",
  "lpa",
  "wai",
  "ngpa",
  "papa",
  "naacp_aviation",
  "eaa",
  "aopa",
  "faa_safety",
] as const;

function trimmed(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value === "" ? null : value;
}

function list(formData: FormData, key: string, allowed: readonly string[]) {
  return formData
    .getAll(key)
    .map((entry) => String(entry))
    .filter((entry) => allowed.includes(entry));
}

/**
 * A pilot saves their own profile.
 *
 * Nothing here can set the vetting fields, and that is enforced twice: this
 * action does not name them, and 0034's column grant would refuse them with
 * 42501 if it did. A pilot who could verify themselves could walk into a
 * classroom unvetted, which is the one failure in this feature that would matter.
 */
export async function savePilot(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Please log in again." };
  }

  const displayName = trimmed(formData, "displayName");
  const jobTitle = trimmed(formData, "jobTitle");

  if (!displayName || displayName.length < 2) {
    return { error: "How would you like a class to be introduced to you?" };
  }

  if (!jobTitle) {
    return {
      error:
        "What do you fly, and what is your seat? Write it the way you would say it out loud.",
    };
  }

  const radiusRaw = trimmed(formData, "travelRadiusMiles");
  const radius = radiusRaw === null ? null : Number.parseInt(radiusRaw, 10);

  if (
    radius !== null &&
    (!Number.isInteger(radius) || radius < 0 || radius > 3000)
  ) {
    return {
      error:
        "How far will you travel, in miles? Leave it blank if you are not sure.",
    };
  }

  const state = trimmed(formData, "homeState");

  if (state !== null && state.length !== 2) {
    return { error: "Write your state as two letters, like CA." };
  }

  // The certificate number exists so a person can check it against the FAA
  // airman registry. A name is not checkable, and a name is what gets typed here
  // by anyone who has been writing "Jane Doe, CFI 1234567" into the review page
  // all week. So refuse anything with a space or a comma in it.
  //
  // Deliberately loose beyond that: certificate formats vary, and the real
  // control is a human reading the registry rather than a regular expression.
  const certificateNumber = trimmed(formData, "certificateNumber");

  if (
    certificateNumber !== null &&
    !/^[A-Za-z0-9-]{3,40}$/.test(certificateNumber)
  ) {
    return {
      error:
        "Just the certificate number — digits and letters, no name and no spaces. It is there so we can look it up.",
    };
  }

  const firstInFamilyRaw = String(formData.get("firstInFamily") ?? "");

  const input: PilotUpsert = {
    displayName,
    jobTitle,
    employer: trimmed(formData, "employer"),
    homeCity: trimmed(formData, "homeCity"),
    homeState: state ? state.toUpperCase() : null,
    homeAirport: trimmed(formData, "homeAirport")?.toUpperCase() ?? null,
    travelRadiusMiles: radius,
    willDoVirtual: formData.get("willDoVirtual") === "on",
    story: trimmed(formData, "story"),
    grewUpIn: trimmed(formData, "grewUpIn"),
    routeIn: (() => {
      const value = trimmed(formData, "routeIn");
      return value && (ROUTES as readonly string[]).includes(value)
        ? value
        : null;
    })(),
    firstInFamily:
      firstInFamilyRaw === "yes"
        ? true
        : firstInFamilyRaw === "no"
          ? false
          : null,
    wishIHadKnown: trimmed(formData, "wishIHadKnown"),
    languages: String(formData.get("languages") ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0 && entry.length <= 40)
      .slice(0, 8),
    affiliations: list(formData, "affiliations", AFFILIATIONS),
    // Self-declared, and it grants nothing: reviewing content is
    // content_reviewers and entering a classroom is vetting_status, both of
    // which an administrator decides. See 0040.
    isCfi: formData.get("isCfi") === "on",
    certificateNumber,
  };

  try {
    const existing = await loadOwnPilotProfile(supabase, user.id);
    await savePilotProfile(supabase, user.id, input, existing !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("Pilot profile save failed:", {
      userId: user.id,
      error: message,
    });

    return { error: "We could not save that. Please try again." };
  }

  revalidatePath("/pilot");

  return { message: "Saved." };
}
