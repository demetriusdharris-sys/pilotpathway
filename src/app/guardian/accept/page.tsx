import { createHash } from "node:crypto";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmGuardianLink } from "./actions";

export const metadata = {
  title: "Confirm guardian access — PilotPathway.ai",
};

/**
 * One message for every unusable link: not found, already redeemed, expired,
 * revoked. Telling the visitor which one it was turns this page into an
 * oracle -- someone guessing tokens could learn that a value existed but had
 * expired, which is more than they should be able to find out.
 */
const LINK_UNUSABLE_TITLE = "This link is no longer valid";
const LINK_UNUSABLE_BODY =
  "It may have expired, already been used, or been replaced by a newer one. Ask the student to send you a new invite from their account.";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="bg-primary flex flex-1 flex-col items-center justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="text-gold text-sm font-semibold tracking-[0.2em] uppercase"
        >
          PilotPathway.ai
        </Link>
        <Card className="mt-5">{children}</Card>
      </div>
    </main>
  );
}

function UnusableLink() {
  return (
    <Shell>
      <CardHeader>
        <CardTitle>{LINK_UNUSABLE_TITLE}</CardTitle>
        <CardDescription className="text-pretty">
          {LINK_UNUSABLE_BODY}
        </CardDescription>
      </CardHeader>
    </Shell>
  );
}

export default async function GuardianAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token, status } = await searchParams;

  // Post-submit states. Checked first: the token is spent by this point, so
  // looking it up again would render the "no longer valid" message to someone
  // who just succeeded.
  if (status === "confirmed") {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>Approval confirmed</CardTitle>
          <CardDescription className="text-pretty">
            Thank you. You are now recorded as this student&apos;s parent or
            guardian. You can close this page.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to PilotPathway</Link>
          </Button>
        </CardFooter>
      </Shell>
    );
  }

  if (status === "failed") {
    return <UnusableLink />;
  }

  if (!token) {
    return <UnusableLink />;
  }

  const admin = createAdminClient();

  if (!admin) {
    console.error(
      "Guardian accept page blocked: SUPABASE_SERVICE_ROLE_KEY is missing.",
    );
    return (
      <Shell>
        <CardHeader>
          <CardTitle>We cannot check that link right now</CardTitle>
          <CardDescription className="text-pretty">
            This is a problem on our side, not with your link. Please try again
            shortly.
          </CardDescription>
        </CardHeader>
      </Shell>
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { data: link, error } = await admin
    .from("guardian_links")
    .select("id, student_user_id, status, token_expires_at, token_redeemed_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    console.error("Guardian accept lookup failed:", error.message);
    return <UnusableLink />;
  }

  const expiresAt =
    typeof link?.token_expires_at === "string"
      ? Date.parse(link.token_expires_at)
      : Number.NaN;

  const usable =
    link !== null &&
    link.status !== "revoked" &&
    link.token_redeemed_at === null &&
    Number.isFinite(expiresAt) &&
    expiresAt > Date.now();

  if (!usable) {
    return <UnusableLink />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = encodeURIComponent(`/guardian/accept?token=${token}`);

    return (
      <Shell>
        <CardHeader>
          <CardTitle>Confirm you are this student&apos;s guardian</CardTitle>
          <CardDescription className="text-pretty">
            A student has asked you to approve their PilotPathway ground school
            account. To confirm, create a free account or log in — that is how
            we know the approval came from you and not from the student.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            asChild
            className="bg-gold text-gold-foreground hover:bg-gold/90 w-full"
          >
            <Link href={`/signup?next=${next}`}>Create a free account</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/login?next=${next}`}>I already have an account</Link>
          </Button>
        </CardContent>
      </Shell>
    );
  }

  // Defence in depth. The action checks this too, and that check is the real
  // gate -- this one exists so a student who opens their own link is told why
  // rather than handed a button that fails.
  if (link.student_user_id === user.id) {
    return (
      <Shell>
        <CardHeader>
          <CardTitle>This link is not for your own account</CardTitle>
          <CardDescription className="text-pretty">
            You are logged in as the student this invite was sent about. A
            parent or guardian has to confirm it from their own account.
          </CardDescription>
        </CardHeader>
      </Shell>
    );
  }

  return (
    <Shell>
      <CardHeader>
        <CardTitle>Confirm you are this student&apos;s guardian</CardTitle>
        <CardDescription className="text-pretty">
          You are confirming that you are the parent or legal guardian of the
          student who sent this invite, and that you approve their PilotPathway
          ground school account.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
          <li className="flex gap-2 text-pretty">
            <span aria-hidden className="text-gold mt-px">
              ✓
            </span>
            <span>
              Confirming as <strong className="text-foreground">{user.email}</strong>
            </span>
          </li>
          <li className="flex gap-2 text-pretty">
            <span aria-hidden className="text-gold mt-px">
              ✓
            </span>
            <span>
              Ground school itself is free and always available to the student.
              This approval is for the parts that need a guardian&apos;s consent.
            </span>
          </li>
          <li className="flex gap-2 text-pretty">
            <span aria-hidden className="text-gold mt-px">
              ✓
            </span>
            <span>You can withdraw approval later from your account.</span>
          </li>
        </ul>
      </CardContent>

      <CardFooter>
        <form action={confirmGuardianLink} className="w-full">
          <input type="hidden" name="token" value={token} />
          <Button
            type="submit"
            className="bg-gold text-gold-foreground hover:bg-gold/90 w-full"
          >
            Confirm approval
          </Button>
        </form>
      </CardFooter>
    </Shell>
  );
}
