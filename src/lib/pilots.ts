import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Pilot mentors — working aviators who volunteer in classrooms.
 *
 * Being one is the existence of a `pilot_profiles` row, not a value in
 * `profiles.role`. Same reasoning as 0033: one person can be a pilot, a teacher
 * at a school, and a content reviewer, and a single-valued role cannot say so.
 *
 * Reads and writes go through the pilot's own client. The RLS policies from 0034
 * are the control: a pilot sees their own profile, anyone signed in sees a
 * verified one, and the vetting columns are ungranted so a pilot cannot verify
 * themselves. That grant is what stops an unvetted adult putting themselves in
 * front of a classroom, so nothing here should ever use the service role to
 * write a profile.
 */

export const ROUTE_IN_LABEL: Record<string, string> = {
  military: "Military",
  community_college: "Community college",
  university: "University",
  flight_school_self_funded: "Flight school, paid my own way",
  airline_cadet: "Airline cadet programme",
  family_business: "Family business",
  other: "Another way in",
};

export type Affiliation = {
  slug: string;
  name: string;
  longName: string;
};

export type PilotProfile = {
  userId: string;
  displayName: string;
  jobTitle: string;
  employer: string | null;
  homeCity: string | null;
  homeState: string | null;
  homeAirport: string | null;
  travelRadiusMiles: number | null;
  willDoVirtual: boolean;
  story: string | null;
  grewUpIn: string | null;
  routeIn: string | null;
  firstInFamily: boolean | null;
  wishIHadKnown: string | null;
  languages: string[];
  affiliations: string[];
  isCfi: boolean;
  certificateNumber: string | null;
  vettingStatus: "unverified" | "pending" | "verified" | "declined";
  vettedBy: string | null;
  vettedAt: string | null;
  vettingExpiresAt: string | null;
  vettingNote: string | null;
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

const COLUMNS =
  "user_id, display_name, job_title, employer, home_city, home_state, home_airport, travel_radius_miles, will_do_virtual, story, grew_up_in, route_in, first_in_family, wish_i_had_known, languages, affiliations, is_cfi, certificate_number, vetting_status, vetted_by, vetted_at, vetting_expires_at, vetting_note";

function toProfile(row: Row): PilotProfile | null {
  const userId = text(row.user_id);
  const displayName = text(row.display_name);
  const jobTitle = text(row.job_title);

  if (!userId || !displayName || !jobTitle) return null;

  const status = text(row.vetting_status) ?? "unverified";

  return {
    userId,
    displayName,
    jobTitle,
    employer: text(row.employer),
    homeCity: text(row.home_city),
    homeState: text(row.home_state),
    homeAirport: text(row.home_airport),
    travelRadiusMiles:
      typeof row.travel_radius_miles === "number"
        ? row.travel_radius_miles
        : null,
    willDoVirtual: row.will_do_virtual !== false,
    story: text(row.story),
    grewUpIn: text(row.grew_up_in),
    routeIn: text(row.route_in),
    firstInFamily:
      typeof row.first_in_family === "boolean" ? row.first_in_family : null,
    wishIHadKnown: text(row.wish_i_had_known),
    languages: stringList(row.languages),
    affiliations: stringList(row.affiliations),
    isCfi: row.is_cfi === true,
    certificateNumber: text(row.certificate_number),
    vettingStatus: (["unverified", "pending", "verified", "declined"].includes(
      status,
    )
      ? status
      : "unverified") as PilotProfile["vettingStatus"],
    vettedBy: text(row.vetted_by),
    vettedAt: text(row.vetted_at),
    vettingExpiresAt: text(row.vetting_expires_at),
    vettingNote: text(row.vetting_note),
  };
}

export async function loadAffiliations(
  supabase: SupabaseClient,
): Promise<Affiliation[]> {
  const { data, error } = await supabase
    .from("aviation_affiliations")
    .select("slug, name, long_name")
    .order("position");

  if (error) {
    // Context, not correctness. A failed read means no checkboxes rather than a
    // page that will not load.
    console.error("Could not read affiliations:", { error: error.message });
    return [];
  }

  const list: Affiliation[] = [];

  for (const row of (data ?? []) as Row[]) {
    const slug = text(row.slug);
    const name = text(row.name);
    const longName = text(row.long_name);
    if (slug && name && longName) list.push({ slug, name, longName });
  }

  return list;
}

/** The caller's own profile, or null if they have not made one. */
export async function loadOwnPilotProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<PilotProfile | null> {
  const { data, error } = await supabase
    .from("pilot_profiles")
    .select(COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`pilot profile: ${error.message}`);
  }

  return data ? toProfile(data as Row) : null;
}

export type PilotUpsert = {
  displayName: string;
  jobTitle: string;
  employer: string | null;
  homeCity: string | null;
  homeState: string | null;
  homeAirport: string | null;
  travelRadiusMiles: number | null;
  willDoVirtual: boolean;
  story: string | null;
  grewUpIn: string | null;
  routeIn: string | null;
  firstInFamily: boolean | null;
  wishIHadKnown: string | null;
  languages: string[];
  affiliations: string[];
  isCfi: boolean;
  certificateNumber: string | null;
};

/**
 * Creates or updates the caller's own profile.
 *
 * Writes only the columns 0034 grants, so the vetting fields cannot be touched
 * from here even by mistake — the database would refuse with 42501, but not
 * naming them means the question never arises.
 */
export async function savePilotProfile(
  supabase: SupabaseClient,
  userId: string,
  input: PilotUpsert,
  exists: boolean,
): Promise<void> {
  const payload = {
    display_name: input.displayName,
    job_title: input.jobTitle,
    employer: input.employer,
    home_city: input.homeCity,
    home_state: input.homeState,
    home_airport: input.homeAirport,
    travel_radius_miles: input.travelRadiusMiles,
    will_do_virtual: input.willDoVirtual,
    story: input.story,
    grew_up_in: input.grewUpIn,
    route_in: input.routeIn,
    first_in_family: input.firstInFamily,
    wish_i_had_known: input.wishIHadKnown,
    languages: input.languages,
    affiliations: input.affiliations,
    is_cfi: input.isCfi,
    certificate_number: input.certificateNumber,
  };

  const { error } = exists
    ? await supabase
        .from("pilot_profiles")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
    : await supabase
        .from("pilot_profiles")
        .insert({ user_id: userId, ...payload });

  if (error) {
    throw new Error(error.message);
  }
}

/** Every pilot, for the admin vetting queue. Service role. */
export async function loadAllPilots(
  admin: SupabaseClient,
): Promise<{ profile: PilotProfile; email: string | null }[]> {
  const { data, error } = await admin
    .from("pilot_profiles")
    .select(COLUMNS)
    .order("vetting_status")
    .order("created_at");

  if (error) {
    throw new Error(`pilots: ${error.message}`);
  }

  const rows = (data ?? []) as Row[];
  const profiles = rows
    .map(toProfile)
    .filter((entry): entry is PilotProfile => entry !== null);

  if (profiles.length === 0) return [];

  const { data: emails } = await admin
    .from("profiles")
    .select("id, email")
    .in(
      "id",
      profiles.map((entry) => entry.userId),
    );

  const emailById = new Map<string, string>();
  for (const row of (emails ?? []) as Row[]) {
    const id = text(row.id);
    const email = text(row.email);
    if (id && email) emailById.set(id, email);
  }

  return profiles.map((profile) => ({
    profile,
    email: emailById.get(profile.userId) ?? null,
  }));
}

/** Records an attestation that a background check was done. Admins only. */
export async function setPilotVetting(
  supabase: SupabaseClient,
  email: string,
  status: "unverified" | "pending" | "verified" | "declined",
  vettedBy: string,
  expires: string | null,
  note: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc("set_pilot_vetting", {
    p_email: email,
    p_status: status,
    p_vetted_by: vettedBy,
    p_expires: expires,
    p_note: note,
  });

  if (error) {
    throw new Error(error.message);
  }

  return typeof data === "string" ? data : "Done.";
}

/**
 * Flight instructors who have signed up, and whether they can review yet.
 *
 * The point of this read: a CFI who ticks "I am a flight instructor" is exactly
 * the person the content review queue has been waiting for, and without somewhere
 * to see them they are a row in a table nobody opens. It turns finding a reviewer
 * from a search into a list.
 *
 * `is_cfi` and the certificate number are self-declared and verified by nobody
 * here — the number is recorded so a person can check it against the FAA airman
 * registry, which is a judgement no query should pretend to make.
 */
export async function loadCfiCandidates(
  admin: SupabaseClient,
): Promise<
  { profile: PilotProfile; email: string | null; mayReview: boolean }[]
> {
  const { data, error } = await admin
    .from("pilot_profiles")
    .select(COLUMNS)
    .eq("is_cfi", true)
    .order("created_at");

  if (error) {
    throw new Error(`flight instructors: ${error.message}`);
  }

  const profiles = ((data ?? []) as Row[])
    .map(toProfile)
    .filter((entry): entry is PilotProfile => entry !== null);

  if (profiles.length === 0) return [];

  const ids = profiles.map((entry) => entry.userId);

  const [emailResult, reviewerResult] = await Promise.all([
    admin.from("profiles").select("id, email").in("id", ids),
    admin
      .from("content_reviewers")
      .select("user_id")
      .in("user_id", ids)
      .is("revoked_at", null),
  ]);

  const emailById = new Map<string, string>();
  for (const row of (emailResult.data ?? []) as Row[]) {
    const id = text(row.id);
    const email = text(row.email);
    if (id && email) emailById.set(id, email);
  }

  const reviewers = new Set<string>();
  for (const row of (reviewerResult.data ?? []) as Row[]) {
    const id = text(row.user_id);
    if (id) reviewers.add(id);
  }

  return profiles.map((profile) => ({
    profile,
    email: emailById.get(profile.userId) ?? null,
    mayReview: reviewers.has(profile.userId),
  }));
}
