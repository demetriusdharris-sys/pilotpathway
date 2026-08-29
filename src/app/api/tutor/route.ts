import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getLesson } from "@/lib/curriculum";
import {
  estimateCostCents,
  readUsageLimits,
  recordTutorCost,
  reserveTutorMessage,
} from "@/lib/tutor-usage";
import {
  buildLessonContext,
  isTutorMessage,
  MAX_HISTORY_MESSAGES,
  SYSTEM_PROMPT,
  TUTOR_MAX_TOKENS,
  TUTOR_MODEL,
  type TutorMessage,
} from "@/lib/tutor";

const MAX_MESSAGE_CHARS = 4000;

/**
 * Maps an upstream failure to a status and a student-facing message.
 *
 * Nothing here leaks billing state or provider detail to the browser; the
 * real error is logged server-side with its full text.
 */
function classifyUpstreamError(error: unknown): {
  status: number;
  code: string;
  message: string;
} {
  if (error instanceof Anthropic.RateLimitError) {
    return {
      status: 503,
      code: "upstream_busy",
      message:
        "Your instructor is handling a lot of questions right now. Try again in a moment.",
    };
  }
  if (
    error instanceof Anthropic.AuthenticationError ||
    error instanceof Anthropic.PermissionDeniedError
  ) {
    return {
      status: 503,
      code: "upstream_unavailable",
      message:
        "Your instructor is unavailable right now. This is on our side, not yours — please tell your program lead.",
    };
  }
  if (error instanceof Anthropic.BadRequestError) {
    // Includes the "credit balance is too low" case.
    return {
      status: 503,
      code: "upstream_unavailable",
      message:
        "Your instructor is unavailable right now. This is on our side, not yours — please tell your program lead.",
    };
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return {
      status: 503,
      code: "upstream_unreachable",
      message: "Could not reach your instructor. Check your connection and try again.",
    };
  }
  return {
    status: 502,
    code: "upstream_failed",
    message: "Something went wrong reaching your instructor. Try asking again.",
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The AI instructor is not configured yet.", code: "not_configured" },
      { status: 503 },
    );
  }

  // Gate on a real session. Without this the route is an open proxy to a
  // paid API key for anyone who finds the URL.
  if (!getSupabaseEnv()) {
    return NextResponse.json(
      { error: "Not configured.", code: "not_configured" },
      { status: 503 },
    );
  }

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

  const { messages, stageSlug, lessonSlug } = (body ?? {}) as {
    messages?: unknown;
    stageSlug?: unknown;
    lessonSlug?: unknown;
  };

  if (!Array.isArray(messages) || !messages.every(isTutorMessage)) {
    return NextResponse.json(
      { error: "Invalid request.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Ask a question first.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (messages.some((m: TutorMessage) => m.content.length > MAX_MESSAGE_CHARS)) {
    return NextResponse.json(
      { error: "That message is too long. Try breaking it up.", code: "too_long" },
      { status: 400 },
    );
  }

  // --- Rate limiting and spend protection -----------------------------------
  //
  // Everything below runs BEFORE any call to Anthropic. The reservation is
  // what makes the cap real: it increments on every attempt, so a loop of
  // requests that fail upstream still burns quota and cannot bypass the limit.

  const admin = createAdminClient();

  if (!admin) {
    // Fail closed. Without the service role key we cannot count usage, and an
    // uncounted request is an uncapped one.
    console.error(
      "Tutor route blocked: SUPABASE_SERVICE_ROLE_KEY is missing, so usage cannot be metered.",
    );
    return NextResponse.json(
      {
        error:
          "Your instructor is unavailable right now. This is on our side, not yours — please tell your program lead.",
        code: "usage_metering_unavailable",
      },
      { status: 503 },
    );
  }

  const limits = await readUsageLimits(admin);
  const decision = await reserveTutorMessage(admin, user.id, limits);

  if (!decision.allowed) {
    const isGlobal = decision.scope === "global";
    return NextResponse.json(
      {
        error: isGlobal
          ? "PilotPathway has hit today's limit across all students. Your instructor will be back tomorrow."
          : "You've reached today's practice limit with your instructor. It resets tomorrow.",
        code: isGlobal ? "global_daily_limit" : "daily_limit",
        used: decision.used,
        limit: decision.limit,
      },
      { status: 429 },
    );
  }

  // --- Upstream call --------------------------------------------------------

  const anthropic = new Anthropic();

  // Two system blocks. The frozen instructor prompt goes first and is
  // cached: it is ~2,700 tokens and identical on every single turn, so
  // paying full price for it each time is the dominant cost. The
  // per-lesson context varies and sits after the breakpoint.
  const found =
    typeof stageSlug === "string" && typeof lessonSlug === "string"
      ? getLesson(stageSlug, lessonSlug)
      : undefined;

  const system = found
    ? [
        {
          type: "text" as const,
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" as const },
        },
        {
          type: "text" as const,
          text: buildLessonContext(found.stage, found.lesson),
        },
      ]
    : [
        {
          type: "text" as const,
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" as const },
        },
      ];

  const upstream = anthropic.messages.stream({
    model: TUTOR_MODEL,
    max_tokens: TUTOR_MAX_TOKENS,
    system,
    messages: messages.slice(-MAX_HISTORY_MESSAGES),
  });

  const iterator = upstream[Symbol.asyncIterator]();

  // Pull the first event BEFORE returning a Response.
  //
  // Previously the whole stream ran inside ReadableStream.start(), so by the
  // time an error surfaced the 200 headers were already sent and a genuine
  // failure — billing, outage, auth — reached the student as a successful
  // response containing an apology. Nothing upstream could distinguish that
  // from a working reply. Awaiting the first event lets a pre-stream failure
  // return a real status code with the actual cause logged.
  let firstEvent: IteratorResult<Anthropic.MessageStreamEvent>;
  try {
    firstEvent = await iterator.next();
  } catch (error) {
    const { status, code, message } = classifyUpstreamError(error);
    console.error("Tutor upstream failed before streaming started:", {
      code,
      status,
      userId: user.id,
      lesson: found?.lesson.slug ?? null,
      error: error instanceof Error ? error.message : String(error),
      detail: error instanceof Anthropic.APIError ? error.error : undefined,
    });
    return NextResponse.json({ error: message, code }, { status });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: Anthropic.MessageStreamEvent) => {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      };

      try {
        if (!firstEvent.done && firstEvent.value) {
          emit(firstEvent.value);
        }

        while (!firstEvent.done) {
          const next = await iterator.next();
          if (next.done) break;
          emit(next.value);
        }

        const final = await upstream.finalMessage();

        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\nI can't help with that one. Ask your CFI, and let's get back to the lesson.",
            ),
          );
        }

        await recordTutorCost(admin, user.id, estimateCostCents(final.usage));
      } catch (error) {
        // Headers are already sent, so the status cannot be changed. Log the
        // real cause with full detail so this is visible in monitoring rather
        // than disguised as a normal reply.
        console.error("Tutor stream failed mid-response:", {
          userId: user.id,
          lesson: found?.lesson.slug ?? null,
          error: error instanceof Error ? error.message : String(error),
          detail: error instanceof Anthropic.APIError ? error.error : undefined,
        });
        controller.enqueue(
          encoder.encode(
            "\n\n[The connection to your instructor dropped mid-answer. Ask again to continue.]",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Tutor-Messages-Remaining": String(
        Math.max(decision.limit - decision.used, 0),
      ),
    },
  });
}
