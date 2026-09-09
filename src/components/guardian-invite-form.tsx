"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Outcome =
  | { kind: "sent"; email: string }
  | { kind: "created_not_sent" }
  | { kind: "error"; message: string };

/**
 * Narrows the invite route's JSON without trusting it. The route is ours, but
 * a parse here is cheaper than a runtime surprise if its shape ever changes.
 */
function readResponse(value: unknown): {
  ok: boolean;
  emailSent: boolean;
  error: string | null;
} {
  if (typeof value !== "object" || value === null) {
    return { ok: false, emailSent: false, error: null };
  }

  const record: Record<string, unknown> = { ...value };

  return {
    ok: record.ok === true,
    emailSent: record.emailSent === true,
    error: typeof record.error === "string" ? record.error : null,
  };
}

const GENERIC_ERROR = "That did not go through. Try again in a moment.";

export function GuardianInviteForm({
  fixedEmail,
  submitLabel,
  pendingLabel,
}: {
  /** Set for a resend: the address is already chosen, so no input is shown. */
  fixedEmail?: string;
  submitLabel: string;
  pendingLabel: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(fixedEmail ?? "");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) return;

    setPending(true);
    setOutcome(null);

    try {
      const response = await fetch("/api/guardian/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guardianEmail: email }),
      });

      const parsed = readResponse(await response.json().catch(() => null));

      if (!response.ok || !parsed.ok) {
        setOutcome({ kind: "error", message: parsed.error ?? GENERIC_ERROR });
        return;
      }

      // The invite row exists either way. Only the email is in doubt, and
      // saying so plainly is better than a success message that turns into a
      // parent who never heard from us.
      setOutcome(
        parsed.emailSent
          ? { kind: "sent", email }
          : { kind: "created_not_sent" },
      );

      // Re-render the server component so the section reflects the new
      // pending link. This form is replaced by the pending card when an
      // invite is created for the first time.
      router.refresh();
    } catch {
      setOutcome({ kind: "error", message: GENERIC_ERROR });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
      {fixedEmail ? null : (
        <div className="flex flex-col gap-2">
          <Label htmlFor="guardianEmail">
            Parent or guardian&apos;s email
          </Label>
          <Input
            id="guardianEmail"
            name="guardianEmail"
            type="email"
            required
            autoComplete="off"
            placeholder="them@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      )}

      {outcome?.kind === "sent" ? (
        <p
          role="status"
          className="border-border bg-secondary text-secondary-foreground rounded-md border px-3 py-2 text-sm text-pretty"
        >
          Sent to {outcome.email}. They have 14 days to confirm.
        </p>
      ) : null}

      {outcome?.kind === "created_not_sent" ? (
        <p
          role="status"
          className="border-border bg-secondary text-secondary-foreground rounded-md border px-3 py-2 text-sm text-pretty"
        >
          We saved the invite, but the email did not go out. Use resend in a
          moment — nothing is lost.
        </p>
      ) : null}

      {outcome?.kind === "error" ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm text-pretty"
        >
          {outcome.message}
        </p>
      ) : null}

      <div>
        <Button
          type="submit"
          disabled={pending || email.trim().length === 0}
          variant={fixedEmail ? "outline" : "default"}
          size={fixedEmail ? "sm" : "default"}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
