import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";

/**
 * Pinned to the Node runtime because this route depends on node:crypto for
 * token generation. Node is already the default for route handlers; declaring
 * it means a future config change cannot silently move this to Edge, where
 * randomBytes does not exist and guardianship tokens are the last thing that
 * should fail quietly.
 */
export const runtime = "nodejs";

/** Deliberately simple. Real validation is whether the mail arrives. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_EMAIL_CHARS = 254;

const RELATIONSHIPS = ["parent", "legal_guardian", "other"] as const;
type Relationship = (typeof RELATIONSHIPS)[number];

const INVITE_TTL_DAYS = 14;

function asRelationship(value: unknown): Relationship | null {
  if (value === undefined || value === null) {
    return "parent";
  }
  const allowed: readonly string[] = RELATIONSHIPS;
  return typeof value === "string" && allowed.includes(value)
    ? (value as Relationship)
    : null;
}

function buildEmailBodies(acceptUrl: string): { html: string; text: string } {
  const text = `A student has asked you to approve their PilotPathway ground school account.

PilotPathway is a free online ground school for student pilots. Someone has listed you as their parent or guardian, and some parts of the programme cannot be switched on for a student under 18 without your approval.

To confirm, open this link:
${acceptUrl}

You will be asked to create a free account, which is how we know the approval came from you and not from the student.

This link expires in ${INVITE_TTL_DAYS} days.

If you were not expecting this, you can ignore this email. Nothing is switched on unless you confirm.`;

  const html = `<div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; font-size: 16px; line-height: 1.5; color: #111;">
  <p>A student has asked you to approve their PilotPathway ground school account.</p>
  <p>PilotPathway is a free online ground school for student pilots. Someone has listed you as their parent or guardian, and some parts of the programme cannot be switched on for a student under 18 without your approval.</p>
  <p><a href="${acceptUrl}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 8px;">Review and approve</a></p>
  <p>You will be asked to create a free account, which is how we know the approval came from you and not from the student.</p>
  <p>This link expires in ${INVITE_TTL_DAYS} days.</p>
  <p style="color: #555;">If you were not expecting this, you can ignore this email. Nothing is switched on unless you confirm.</p>
  <p style="color: #555; font-size: 14px;">If the button does not work, paste this into your browser:<br>${acceptUrl}</p>
</div>`;

  return { html, text };
}

export async function POST(request: NextRequest) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request.", code: "bad_request" },
      { status: 400 },
    );
  }

  const { guardianEmail, relationship } = (body ?? {}) as {
    guardianEmail?: unknown;
    relationship?: unknown;
  };

  if (
    typeof guardianEmail !== "string" ||
    guardianEmail.trim().length === 0 ||
    guardianEmail.trim().length > MAX_EMAIL_CHARS ||
    !EMAIL_PATTERN.test(guardianEmail.trim())
  ) {
    return NextResponse.json(
      {
        error: "Enter the email address of your parent or guardian.",
        code: "bad_request",
      },
      { status: 400 },
    );
  }

  const parsedRelationship = asRelationship(relationship);

  if (!parsedRelationship) {
    return NextResponse.json(
      { error: "Invalid request.", code: "bad_request" },
      { status: 400 },
    );
  }

  const invitedEmail = guardianEmail.trim().toLowerCase();

  // A student inviting their own address would satisfy email_invite against
  // themselves, which is precisely the hole tiered consent exists to close.
  if (invitedEmail === (user.email ?? "").trim().toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "That is your own email address. Ask a parent or guardian for theirs.",
        code: "self_invite",
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  if (!admin) {
    // Fail closed, same as the tutor route. Every guardian_links write goes
    // through the service role by design; without it there is no safe path.
    console.error(
      "Guardian invite blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return NextResponse.json(
      {
        error:
          "Invites are unavailable right now. This is on our side, not yours — please tell your program lead.",
        code: "service_unavailable",
      },
      { status: 503 },
    );
  }

  const { data: existingRows, error: lookupError } = await admin
    .from("guardian_links")
    .select("id, status")
    .eq("student_user_id", user.id)
    .eq("invited_email", invitedEmail)
    .neq("status", "revoked");

  if (lookupError) {
    console.error("Guardian invite lookup failed:", {
      studentUserId: user.id,
      error: lookupError.message,
    });
    return NextResponse.json(
      { error: "That invite could not be sent. Try again shortly.", code: "lookup_failed" },
      { status: 500 },
    );
  }

  const rows = existingRows ?? [];

  if (rows.some((row) => row.status === "verified")) {
    return NextResponse.json(
      {
        error: "That guardian is already linked to your account.",
        code: "already_linked",
      },
      { status: 409 },
    );
  }

  const pending = rows.find((row) => row.status === "pending");

  // The raw token exists only in memory and in the email. Only its hash is
  // ever written, so a leak of the table cannot be redeemed.
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const tokenExpiresAt = new Date(
    Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // There is no unique constraint on (student_user_id, invited_email) in 0007,
  // so this cannot be a single upsert. Resending overwrites the pending row's
  // token, which also invalidates any link already in a mailbox.
  const writeError = pending
    ? (
        await admin
          .from("guardian_links")
          .update({
            relationship: parsedRelationship,
            status: "pending",
            verification_method: "email_invite",
            token_hash: tokenHash,
            token_expires_at: tokenExpiresAt,
            token_redeemed_at: null,
            guardian_user_id: null,
          })
          .eq("id", pending.id)
      ).error
    : (
        await admin.from("guardian_links").insert({
          student_user_id: user.id,
          invited_email: invitedEmail,
          relationship: parsedRelationship,
          status: "pending",
          verification_method: "email_invite",
          token_hash: tokenHash,
          token_expires_at: tokenExpiresAt,
          token_redeemed_at: null,
          guardian_user_id: null,
        })
      ).error;

  if (writeError) {
    console.error("Guardian invite write failed:", {
      studentUserId: user.id,
      resend: Boolean(pending),
      error: writeError.message,
    });
    return NextResponse.json(
      { error: "That invite could not be sent. Try again shortly.", code: "write_failed" },
      { status: 500 },
    );
  }

  // nextUrl.origin is the fallback: a same-origin fetch does not always carry
  // an Origin header, and a link built from a missing value is a dead link.
  const origin = request.headers.get("origin") ?? request.nextUrl.origin;
  const acceptUrl = `${origin}/guardian/accept?token=${rawToken}`;
  const { html, text } = buildEmailBodies(acceptUrl);

  const sent = await sendEmail({
    to: invitedEmail,
    subject: "A student has asked you to approve their ground school account",
    html,
    text,
  });

  if (!sent.ok) {
    // The pending row is already written, so this is recoverable by resending.
    // Reporting success with emailSent false is more honest than a 500 that
    // implies nothing happened.
    console.error("Guardian invite email failed to send:", {
      studentUserId: user.id,
      error: sent.error,
    });
  }

  return NextResponse.json({
    ok: true,
    status: "pending",
    resent: Boolean(pending),
    emailSent: sent.ok,
    expiresAt: tokenExpiresAt,
  });
}
