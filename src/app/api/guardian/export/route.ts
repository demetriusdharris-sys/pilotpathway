import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAccountExport } from "@/lib/account-export";
import { authorizeGuardianAction } from "@/lib/guardian-access";
import {
  settleGuardianAction,
  startGuardianAction,
} from "@/lib/guardian-audit";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A guardian's download of a minor's data.
 *
 * Unlike the student's own export, this route takes a student id from the
 * request — which is exactly why it trusts nothing about that id until
 * authorizeGuardianAction has confirmed a verified link from the signed-in
 * guardian to that student, and canExport has confirmed the link was verified
 * by a school or staff and the student is a known minor.
 *
 * Every refusal returns the same message, so this route cannot be used to
 * learn whether a given student exists or is linked to someone.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Please log in.", code: "unauthenticated" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian export blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return NextResponse.json(
      {
        error:
          "This download is not available right now. This is on our side, not yours.",
        code: "service_unavailable",
      },
      { status: 503 },
    );
  }

  const refused = NextResponse.json(
    {
      error: "You can't download this student's data.",
      code: "not_permitted",
    },
    { status: 403 },
  );

  const studentId = request.nextUrl.searchParams.get("student") ?? "";

  if (!UUID_PATTERN.test(studentId)) {
    return refused;
  }

  // Set once the permanent record exists, so a failure after that point can
  // mark it failed.
  let recordId: number | null = null;

  try {
    const student = await authorizeGuardianAction(admin, user.id, studentId);

    if (!student || !student.canExport) {
      return refused;
    }

    // A third party reading a minor's data must leave a permanent record.
    // Written before any of the student's data is read; if it cannot be
    // written, the catch below refuses the download.
    recordId = await startGuardianAction(admin, {
      action: "export_data",
      guardianId: user.id,
      guardianEmail: user.email ?? null,
      studentId,
      verificationMethod: student.verificationMethod,
    });

    const { data: authUser } = await admin.auth.admin.getUserById(studentId);

    const body = await buildAccountExport(
      admin,
      studentId,
      {
        email: student.email,
        createdAt: authUser.user?.created_at ?? "",
        lastSignInAt: authUser.user?.last_sign_in_at ?? null,
      },
      "guardian",
    );

    await settleGuardianAction(admin, recordId, "completed");

    console.info("Guardian data export:", {
      recordId,
      guardianId: user.id,
      studentId,
      verificationMethod: student.verificationMethod,
    });

    const day = new Date().toISOString().slice(0, 10);

    return new NextResponse(JSON.stringify(body, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="pilotpathway-student-data-${day}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (recordId !== null) {
      await settleGuardianAction(admin, recordId, "failed");
    }
    console.error("Guardian data export failed:", {
      recordId,
      guardianId: user.id,
      studentId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "This download is not available right now. Try again shortly.",
        code: "export_failed",
      },
      { status: 500 },
    );
  }
}
