import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fallback caps, used only if usage_limits cannot be read (migration not run,
 * row deleted, database unreachable). Deliberately conservative: if we cannot
 * confirm the configured limit, we do not hand out an unlimited one.
 */
const FALLBACK_DAILY_MESSAGES_PER_USER = 150;
const FALLBACK_GLOBAL_DAILY_MESSAGES = 5000;

/**
 * Claude Sonnet 5 pricing, USD per million tokens. Used to estimate spend for
 * observability — this is a record of what was used, not a billing source.
 */
const PRICE_PER_MTOK = {
  input: 2,
  output: 10,
  cacheRead: 0.2,
  cacheWrite: 2.5,
} as const;

export type UsageLimits = {
  dailyMessagesPerUser: number;
  globalDailyMessages: number;
};

export type LimitDecision =
  | { allowed: true; used: number; limit: number }
  | { allowed: false; scope: "user" | "global"; used: number; limit: number };

export async function readUsageLimits(
  admin: SupabaseClient,
): Promise<UsageLimits> {
  const { data, error } = await admin
    .from("usage_limits")
    .select("key, value")
    .in("key", ["daily_messages_per_user", "global_daily_messages"]);

  if (error || !data) {
    return {
      dailyMessagesPerUser: FALLBACK_DAILY_MESSAGES_PER_USER,
      globalDailyMessages: FALLBACK_GLOBAL_DAILY_MESSAGES,
    };
  }

  const byKey = new Map(data.map((row) => [row.key as string, Number(row.value)]));

  const perUser = byKey.get("daily_messages_per_user");
  const global = byKey.get("global_daily_messages");

  return {
    dailyMessagesPerUser:
      Number.isFinite(perUser) && perUser !== undefined
        ? perUser
        : FALLBACK_DAILY_MESSAGES_PER_USER,
    globalDailyMessages:
      Number.isFinite(global) && global !== undefined
        ? global
        : FALLBACK_GLOBAL_DAILY_MESSAGES,
  };
}

/**
 * Checks the global cap, then reserves one message for this student.
 *
 * The reservation happens BEFORE the Anthropic call. If it happened after,
 * requests that fail upstream would never count, and a loop of failing
 * requests could bypass the cap entirely. Every attempt costs quota.
 *
 * The per-user increment is atomic in Postgres, so two concurrent requests
 * cannot both read the same count and each conclude they are under the limit.
 */
export async function reserveTutorMessage(
  admin: SupabaseClient,
  userId: string,
  limits: UsageLimits,
): Promise<LimitDecision> {
  const { data: globalUsed, error: globalError } = await admin.rpc(
    "global_tutor_messages_today",
  );

  if (!globalError && typeof globalUsed === "number") {
    if (globalUsed >= limits.globalDailyMessages) {
      return {
        allowed: false,
        scope: "global",
        used: globalUsed,
        limit: limits.globalDailyMessages,
      };
    }
  }

  const { data: newCount, error } = await admin.rpc("consume_tutor_message", {
    p_user_id: userId,
  });

  // Fail closed. If we cannot record the attempt we cannot enforce the cap,
  // so we decline rather than let an uncounted request through.
  if (error || typeof newCount !== "number") {
    return {
      allowed: false,
      scope: "user",
      used: limits.dailyMessagesPerUser,
      limit: limits.dailyMessagesPerUser,
    };
  }

  if (newCount > limits.dailyMessagesPerUser) {
    return {
      allowed: false,
      scope: "user",
      used: newCount,
      limit: limits.dailyMessagesPerUser,
    };
  }

  return { allowed: true, used: newCount, limit: limits.dailyMessagesPerUser };
}

export function estimateCostCents(usage: {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}): number {
  const input = usage.input_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;

  const dollars =
    (input / 1_000_000) * PRICE_PER_MTOK.input +
    (output / 1_000_000) * PRICE_PER_MTOK.output +
    (cacheRead / 1_000_000) * PRICE_PER_MTOK.cacheRead +
    (cacheWrite / 1_000_000) * PRICE_PER_MTOK.cacheWrite;

  return Number((dollars * 100).toFixed(4));
}

export async function recordTutorCost(
  admin: SupabaseClient,
  userId: string,
  costCents: number,
): Promise<void> {
  const { error } = await admin.rpc("add_tutor_cost", {
    p_user_id: userId,
    p_cost_cents: costCents,
  });

  if (error) {
    // Cost is observability, not enforcement — the message was already
    // counted. Log and move on rather than failing the student's request.
    console.error("Failed to record tutor cost:", error.message);
  }
}
