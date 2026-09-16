import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAccountExport } from "@/lib/account-export";

/**
 * "Download my data": everything this app holds about the signed-in account,
 * as one JSON file.
 *
 * The id comes from getUser() and nowhere else. This route takes no
 * parameters, so there is nothing in the request that could point it at
 * someone else's data. What goes into the file, and why, is documented in
 * buildAccountExport.
 */
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

  try {
    const body = await buildAccountExport(
      admin,
      user.id,
      {
        email: user.email ?? null,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
      },
      "self",
    );

    const day = new Date().toISOString().slice(0, 10);

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
      userId: user.id,
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
