"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AuthState } from "@/app/(auth)/actions";

type AuthFormProps = {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  submitLabel: string;
  pendingLabel: string;
  passwordHint?: string;
  next?: string;
};

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  const [slow, setSlow] = useState(false);

  // A serverless cold start can take tens of seconds. Without this, a slow
  // response is indistinguishable from a crash and the student gives up.
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [pending]);

  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {slow ? (
        <p role="status" className="text-muted-foreground text-xs text-pretty">
          Still working — the server is waking up. This can take up to a
          minute the first time. Don&apos;t refresh.
        </p>
      ) : null}
    </div>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  passwordHint,
  next,
}: AuthFormProps) {
  const [state, formAction] = useActionState<AuthState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {passwordHint ? (
          <p className="text-muted-foreground text-xs">{passwordHint}</p>
        ) : null}
      </div>

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {state.error}
        </p>
      ) : null}

      {state.message ? (
        <p
          role="status"
          className="border-border bg-secondary text-secondary-foreground rounded-md border px-3 py-2 text-sm"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
    </form>
  );
}
