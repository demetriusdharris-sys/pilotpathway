import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * "Download my data": everything this app holds about the signed-in account,
 * as one JSON file.
 *
 * Reads with the service role, because not every table gives a student a
 * SELECT policy on their own rows, and an export that silently omits the
 * tables RLS hides is not a complete record. The only thing standing between
 * that access and someone else's data is that every query below is filtered
 * by the id from getUser() — never by anything the request supplies.
 *
 * Two rules shape what is included:
 *
 *   - The account holder's own data only. Other people's account ids
 *     (guardians, staff, confirmers) are left out. The exception is a guardian
 *     email the student typed in themselves, which they already see on their
 *     profile.
 *   - All or nothing. If any read fails, the export fails. A partial file that
 *     looks complete is worse than no file.
 */

const PAGE_SIZE = 1000;

type PageResult = {
  data: unknown;
  error: { message: string } | null;
};

/**
 * Reads every row a query matches. Supabase returns at most 1,000 rows per
 * request, and a student near the daily message cap passes that in tutor
 * history within a week — so a single read would quietly truncate the export.
 */
async function readAll(
  label: string,
  page: (from: number, to: number) => PromiseLike<PageResult>,
): Promise<unknown[]> {
  const rows: unknown[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${label}: ${error.message}`);
    }

    const batch = Array.isArray(data) ? data : [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please log in to download your data.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error("Data export blocked: SUPABASE_SERVICE_ROLE_KEY is missing.");
    return NextResponse.json(
      {
        error:
          "Your data could not be exported right now. This is on our side, not yours.",
        code: "service_unavailable",
      },
      { status: 503 },
    );
  }

  const id = user.id;

  try {
    const [
      profile,
      lessonProgress,
      tutorUsage,
      tutorMessages,
      conversationSignals,
      quizAnswers,
      guardianLinksAsStudent,
      guardianLinksAsGuardian,
      consentAboutYou,
      consentYouGave,
      milestones,
      organizationMemberships,
      cohortMemberships,
      entitlements,
    ] = await Promise.all([
      readAll("profile", (from, to) =>
        admin
          .from("profiles")
          .select(
            "email, display_name, first_name, date_of_birth, role, created_at, updated_at",
          )
          .eq("id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("lesson progress", (from, to) =>
        admin
          .from("lesson_progress")
          .select("lesson_slug, status, started_at, completed_at, updated_at")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      // Message counts only. The cost column is our spend, not the student's
      // record.
      readAll("tutor usage", (from, to) =>
        admin
          .from("tutor_usage")
          .select("day, message_count")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("tutor messages", (from, to) =>
        admin
          .from("instructor_messages")
          .select("lesson_slug, role, content, created_at")
          .eq("user_id", id)
          .order("created_at")
          .order("id")
          .range(from, to),
      ),
      readAll("conversation signals", (from, to) =>
        admin
          .from("objective_signals")
          .select("objective_id, reading, confidence, lesson_slug, observed_at")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("quiz answers", (from, to) =>
        admin
          .from("objective_assessments")
          .select(
            "objective_id, is_correct, question_text, student_answer, lesson_slug, assessed_at",
          )
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      // token_hash is never exported, and neither is the guardian's own
      // account id.
      readAll("guardian links (as student)", (from, to) =>
        admin
          .from("guardian_links")
          .select(
            "invited_email, relationship, status, verification_method, invited_at, verified_at, revoked_at, token_expires_at, token_redeemed_at",
          )
          .eq("student_user_id", id)
          .order("id")
          .range(from, to),
      ),
      // As a guardian: the relationship and its history, without the
      // student's identifying details.
      readAll("guardian links (as guardian)", (from, to) =>
        admin
          .from("guardian_links")
          .select(
            "relationship, status, verification_method, invited_at, verified_at, revoked_at",
          )
          .eq("guardian_user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("consent about you", (from, to) =>
        admin
          .from("consent")
          .select(
            "scope_key, granted_by_relationship, audience_org_id, granted_at, expires_at, re_consent_due_at, revoked_at, revocation_reason",
          )
          .eq("subject_user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("consent you gave", (from, to) =>
        admin
          .from("consent")
          .select(
            "scope_key, granted_by_relationship, audience_org_id, granted_at, expires_at, revoked_at, revocation_reason",
          )
          .eq("granted_by", id)
          .neq("subject_user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("milestones", (from, to) =>
        admin
          .from("milestones")
          .select(
            "type_key, occurred_on, note, verification, confirmed_at, created_at",
          )
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("organization memberships", (from, to) =>
        admin
          .from("organization_members")
          .select("organization_id, org_role, created_at")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("cohort memberships", (from, to) =>
        admin
          .from("cohort_members")
          .select("cohort_id, joined_at, left_at")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
      readAll("entitlements", (from, to) =>
        admin
          .from("entitlements")
          .select("funder_org_id, starts_at, ends_at, status, note, created_at")
          .eq("user_id", id)
          .order("id")
          .range(from, to),
      ),
    ]);

    const exportedAt = new Date().toISOString();

    const body = {
      exportedAt,
      account: {
        email: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      },
      profile: profile[0] ?? null,
      lessonProgress,
      tutorUsage,
      tutorMessages,
      conversationSignals,
      quizAnswers,
      guardianLinks: {
        asStudent: guardianLinksAsStudent,
        asGuardian: guardianLinksAsGuardian,
      },
      consent: {
        aboutYou: consentAboutYou,
        youGaveForOthers: consentYouGave,
      },
      milestones,
      organizationMemberships,
      cohortMemberships,
      entitlements,
      notes: [
        "This file contains everything PilotPathway's database holds about your account.",
        "conversationSignals are an AI's reading of your tutor conversations, used only to adapt tutoring. They are not a grade, and they are never shared with a school or sponsor. quizAnswers are the only scored record.",
        "Not included, because it is not stored in our database: short-lived server logs, the email delivery log for any guardian invite, sign-in logs kept by our authentication provider, and copies of tutor conversations processed by the AI provider that generates the instructor's replies.",
      ],
    };

    const day = exportedAt.slice(0, 10);

    return new NextResponse(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pilotpathway-my-data-${day}.json"`,
        // Personal data. Never cached by a browser, a proxy, or the CDN.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Data export failed:", {
      userId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Your data could not be exported right now. Try again shortly.",
        code: "export_failed",
      },
      { status: 500 },
    );
  }
}
