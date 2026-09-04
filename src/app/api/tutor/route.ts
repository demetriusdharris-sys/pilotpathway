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
  MAX_HISTORY_MESSAGES,
  SYSTEM_PROMPT,
  TUTOR_MAX_TOKENS,
  TUTOR_MODEL,
} from "@/lib/tutor";
import {
  countConversation,
  loadConversation,
  saveMessage,
} from "@/lib/instructor-messages";
import {
  estimateSignalCostCents,
  extractObjectiveSignals,
} from "@/lib/objective-signals";
import { buildMasteryNotes } from "@/lib/mastery";
import { getProgress } from "@/lib/progress";

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

  // The browser sends only the new question. Conversation history is loaded
  // server-side from the database, so a modified client cannot inject a fake
  // history to steer the tutor or inflate the context we pay for.
  const { message, stageSlug, lessonSlug } = (body ?? {}) as {
    message?: unknown;
    stageSlug?: unknown;
    lessonSlug?: unknown;
  };

  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Ask a question first.", code: "bad_request" },
      { status: 400 },
    );
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json(
      { error: "That message is too long. Try breaking it up.", code: "too_long" },
      { status: 400 },
    );
  }

  const found =
    typeof stageSlug === "string" && typeof lessonSlug === "string"
      ? getLesson(stageSlug, lessonSlug)
      : undefined;

  if (!found) {
    return NextResponse.json(
      { error: "That lesson does not exist.", code: "unknown_lesson" },
      { status: 404 },
    );
  }

  const question = message.trim();

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

  // --- Student context ------------------------------------------------------
  //
  // Everything the tutor needs to know about who it is talking to and where
  // they are. All four reads are independent, so they run concurrently.

  const [history, priorCount, progress, profileResult] = await Promise.all([
    loadConversation(supabase, user.id, found.lesson.slug, MAX_HISTORY_MESSAGES),
    countConversation(supabase, user.id, found.lesson.slug),
    getProgress(user.id),
    supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
  ]);

  const firstName = profileResult.data?.first_name ?? null;

  const masteryNotes = buildMasteryNotes({
    stage: found.stage,
    lesson: found.lesson,
    progress,
    priorMessagesInLesson: priorCount,
  });

  // Persist the question now. If the reply fails the student can see what they
  // asked; an orphan question is recoverable, a lost one is not.
  await saveMessage(supabase, user.id, found.lesson.slug, "user", question);

  // --- Upstream call --------------------------------------------------------

  const anthropic = new Anthropic();

  // Two system blocks. The frozen instructor prompt goes first and is
  // cached: it is ~2,700 tokens and identical on every single turn, so
  // paying full price for it each time is the dominant cost. The
  // per-lesson context varies and sits after the breakpoint.
  const lessonContext = buildLessonContext(
    found.stage,
    found.lesson,
    firstName,
    masteryNotes,
  );

  const system = [
    {
      type: "text" as const,
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: lessonContext,
    },
  ];

  // History from the database, then the new question. The cap is applied to
  // the loaded history so the request cannot grow without bound.
  const conversation = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: question },
  ].slice(-MAX_HISTORY_MESSAGES);

  const upstream = anthropic.messages.stream({
    model: TUTOR_MODEL,
    max_tokens: TUTOR_MAX_TOKENS,
    system,
    messages: conversation,
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
      let reply = "";

      const emit = (event: Anthropic.MessageStreamEvent) => {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          reply += event.delta.text;
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
          const note =
            "\n\nI can't help with that one. Ask your CFI, and let's get back to the lesson.";
          reply += note;
          controller.enqueue(encoder.encode(note));
        }

        // Only persist a reply that actually finished. A partial or failed
        // answer saved here would be replayed as history on every later turn,
        // and the tutor would treat its own truncated sentence as something
        // it had taught.
        const assistantMessageId = await saveMessage(
          supabase,
          user.id,
          found.lesson.slug,
          "assistant",
          reply,
        );

        await recordTutorCost(admin, user.id, estimateCostCents(final.usage));

        // Mastery inference runs after the student already has their answer.
        // It gets its own try/catch rather than riding the outer one: a failure
        // here must not append the "connection dropped" note to a reply that
        // arrived perfectly well, and must not stop controller.close().
        try {
          const { signals, usage: signalUsage } = await extractObjectiveSignals(
            found.lesson,
            question,
            reply,
          );

          // Deliberately NOT recordTutorCost. That meters the student's daily
          // message quota, and inference we chose to run on their conversation
          // is our cost, not their usage. Logged so it stays visible.
          if (signalUsage) {
            console.info("Objective signal call:", {
              userId: user.id,
              lesson: found.lesson.slug,
              signals: signals.length,
              costCents: estimateSignalCostCents(signalUsage),
            });
          }

          // The service role is required: objective_signals has no client
          // INSERT policy, by design — a student who can write their own
          // readings has a mastery record that means nothing.
          if (signals.length > 0 && assistantMessageId) {
            const { error: signalError } = await admin
              .from("objective_signals")
              .insert(
                signals.map((signal) => ({
                  user_id: user.id,
                  objective_id: signal.objectiveId,
                  reading: signal.reading,
                  confidence: signal.confidence,
                  lesson_slug: found.lesson.slug,
                  source_message_id: assistantMessageId,
                })),
              );

            if (signalError) {
              console.error("Failed to write objective signals:", {
                userId: user.id,
                lesson: found.lesson.slug,
                count: signals.length,
                error: signalError.message,
              });
            }
          }
        } catch (error) {
          console.error("Objective signal step failed:", {
            userId: user.id,
            lesson: found.lesson.slug,
            error: error instanceof Error ? error.message : String(error),
          });
        }
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
