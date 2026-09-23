"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { beginPracticeTest } from "@/app/(dashboard)/practice/actions";
import type { AuthState } from "@/app/(auth)/actions";

function StartButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Building your test…" : label}
    </Button>
  );
}

/**
 * Starting a test. Each mode is its own form so the pending state belongs to
 * the button that was pressed, rather than every button going grey at once.
 */
export function PracticeStartForm({
  mode,
  label,
  areas,
}: {
  mode: "full_60" | "quick_20" | "targeted";
  label: string;
  /** Only for targeted: the areas that currently have approved questions. */
  areas?: string[];
}) {
  const [state, formAction] = useActionState<AuthState, FormData>(
    beginPracticeTest,
    {},
  );
  const [target, setTarget] = useState(areas?.[0] ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="mode" value={mode} />

      {mode === "targeted" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="practiceTarget">Which area?</Label>
          <select
            id="practiceTarget"
            name="target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {(areas ?? []).map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm text-pretty"
        >
          {state.error}
        </p>
      ) : null}

      <StartButton label={label} />
    </form>
  );
}
