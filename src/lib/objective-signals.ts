import Anthropic from "@anthropic-ai/sdk";
import type { Lesson } from "@/lib/curriculum";

/**
 * Claude Haiku 4.5 — a cheap, fast judge running alongside every tutor turn.
 * This is a second model call per exchange, so it has to stay far below the
 * tutor's own cost or it doubles the per-message bill.
 */
export const SIGNAL_MODEL = "claude-haiku-4-5-20251001";

/**
 * Enough for a reading on every objective in a lesson and nothing more. The
 * model is asked for JSON only, so a long output means it went wrong.
 */
export const SIGNAL_MAX_TOKENS = 400;

/**
 * Claude Haiku 4.5 pricing, USD per million tokens. Same shape and purpose as
 * PRICE_PER_MTOK in tutor-usage.ts — observability, not a billing source.
 */
const PRICE_PER_MTOK = {
  input: 1,
  output: 5,
  cacheRead: 0.1,
  cacheWrite: 1.25,
} as const;

const READINGS = ["solid", "shaky", "missing"] as const;
const CONFIDENCES = ["low", "medium", "high"] as const;

export type SignalReading = (typeof READINGS)[number];
export type SignalConfidence = (typeof CONFIDENCES)[number];

export type ObjectiveSignal = {
  objectiveId: string;
  reading: SignalReading;
  confidence: SignalConfidence;
};

/** Token usage from the judge call, for cost logging. Null when no call ran. */
export type SignalUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export type ObjectiveSignalResult = {
  signals: ObjectiveSignal[];
  usage: SignalUsage | null;
};

function buildSystemPrompt(lesson: Lesson): string {
  const objectives = lesson.objectives
    .map((objective) => `${objective.id}: ${objective.text}`)
    .join("\n");

  return `You read one exchange between a student pilot and their AI ground instructor, and judge what the student actually demonstrated about this lesson's learning objectives.

LESSON
${lesson.title}

OBJECTIVES
${objectives}

WHAT TO RETURN
Return JSON only. No prose, no explanation, no markdown code fences. A single array of objects, each with exactly three fields:
- "objective_id": one of the ids listed above, copied exactly
- "reading": "solid", "shaky", or "missing"
- "confidence": "low", "medium", or "high"

Return [] when the exchange demonstrated nothing about any objective. That is a normal and frequent answer.

WHAT THE READINGS MEAN
- "solid": the student demonstrated understanding of this objective.
- "shaky": the student showed partial or hesitant understanding.
- "missing": the student showed a real gap in this objective.

A question is not evidence of a gap. Students ask about things they already understand — to confirm, to go deeper, or because they are curious. Only record "missing" when the student said something that actually reveals a gap.

HOW TO SET CONFIDENCE
- "high" requires the student to have explained something in their own words.
- A one-word or one-phrase answer is "low", whatever it shows.
- "medium" is everything in between.

WHAT TO LEAVE OUT
Omit any objective the exchange gave you no evidence about. Do not guess, do not infer from the topic being mentioned, and do not pad the array to look thorough. Judging correctly what was actually shown is worth far more than covering every objective. Most exchanges touch one objective, or none.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asReading(value: unknown): SignalReading | null {
  const readings: readonly string[] = READINGS;
  return typeof value === "string" && readings.includes(value)
    ? (value as SignalReading)
    : null;
}

function asConfidence(value: unknown): SignalConfidence | null {
  const confidences: readonly string[] = CONFIDENCES;
  return typeof value === "string" && confidences.includes(value)
    ? (value as SignalConfidence)
    : null;
}

/**
 * Strips a markdown fence if the model wrapped its JSON in one despite being
 * told not to. Cheaper than a retry, and this is the single most common way a
 * small model deviates from "JSON only."
 */
function stripCodeFence(raw: string): string {
  const text = raw.trim();

  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

/**
 * Validates the model's output against the objectives this lesson actually
 * has. Anything unrecognised is dropped rather than repaired: a hallucinated
 * objective id would violate the foreign key on objective_signals, and a
 * guessed reading is worse than no reading at all.
 */
function parseSignals(raw: string, lesson: Lesson): ObjectiveSignal[] {
  const knownIds = new Set(lesson.objectives.map((objective) => objective.id));

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const signals: ObjectiveSignal[] = [];
  const seen = new Set<string>();

  for (const entry of parsed) {
    if (!isRecord(entry)) {
      continue;
    }

    const objectiveId = entry.objective_id;
    if (typeof objectiveId !== "string" || !knownIds.has(objectiveId)) {
      continue;
    }

    const reading = asReading(entry.reading);
    const confidence = asConfidence(entry.confidence);
    if (!reading || !confidence) {
      continue;
    }

    // One reading per objective per exchange. A duplicate would collide with
    // the unique index on (source_message_id, objective_id).
    if (seen.has(objectiveId)) {
      continue;
    }
    seen.add(objectiveId);

    signals.push({ objectiveId, reading, confidence });
  }

  return signals;
}

/**
 * Reads one tutor exchange and returns what it showed about the lesson's
 * objectives.
 *
 * Never throws. This runs alongside a student's conversation, and a failure to
 * infer mastery must never surface as a failed tutor turn — an empty array
 * means "we learned nothing from this exchange," which is also the honest
 * answer when the judge is unavailable.
 *
 * Usage is returned alongside the signals so the caller can log what the judge
 * cost. It is null when no upstream call was made or the call failed.
 */
export async function extractObjectiveSignals(
  lesson: Lesson,
  studentQuestion: string,
  tutorReply: string,
): Promise<ObjectiveSignalResult> {
  if (lesson.objectives.length === 0) {
    return { signals: [], usage: null };
  }

  try {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: SIGNAL_MODEL,
      max_tokens: SIGNAL_MAX_TOKENS,
      system: buildSystemPrompt(lesson),
      messages: [
        {
          role: "user",
          content: `STUDENT
${studentQuestion}

INSTRUCTOR
${tutorReply}`,
        },
      ],
    });

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("");

    return { signals: parseSignals(text, lesson), usage: response.usage };
  } catch (error) {
    console.error(
      "Objective signal extraction failed:",
      error instanceof Error ? error.message : error,
    );
    return { signals: [], usage: null };
  }
}

/**
 * Mirrors estimateCostCents in tutor-usage.ts, at Haiku's rates rather than
 * Sonnet's. Kept separate rather than parameterised so neither model's pricing
 * can be silently applied to the other.
 */
export function estimateSignalCostCents(usage: {
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
