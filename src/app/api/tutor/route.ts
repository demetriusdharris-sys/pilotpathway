import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { getLesson } from "@/lib/curriculum";
import {
  buildSystemPrompt,
  isTutorMessage,
  MAX_HISTORY_MESSAGES,
  TUTOR_MAX_TOKENS,
  TUTOR_MODEL,
  type TutorMessage,
} from "@/lib/tutor";

const MAX_MESSAGE_CHARS = 4000;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "The AI instructor is not configured yet." },
      { status: 503 },
    );
  }

  // Gate on a real session. Without this the route is an open proxy to a
  // paid API key for anyone who finds the URL.
  if (!getSupabaseEnv()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { messages, stageSlug, lessonSlug } = (body ?? {}) as {
    messages?: unknown;
    stageSlug?: unknown;
    lessonSlug?: unknown;
  };

  if (!Array.isArray(messages) || !messages.every(isTutorMessage)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (messages.length === 0) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  if (messages.some((m: TutorMessage) => m.content.length > MAX_MESSAGE_CHARS)) {
    return NextResponse.json(
      { error: "That message is too long. Try breaking it up." },
      { status: 400 },
    );
  }

  const found =
    typeof stageSlug === "string" && typeof lessonSlug === "string"
      ? getLesson(stageSlug, lessonSlug)
      : undefined;

  const anthropic = new Anthropic();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = anthropic.messages.stream({
          model: TUTOR_MODEL,
          max_tokens: TUTOR_MAX_TOKENS,
          system: buildSystemPrompt(found?.stage, found?.lesson),
          messages: messages.slice(-MAX_HISTORY_MESSAGES),
        });

        for await (const event of upstream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        const final = await upstream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode(
              "\n\nI can't help with that one. Ask your CFI, and let's get back to the lesson.",
            ),
          );
        }
      } catch (error) {
        console.error("Tutor stream failed:", error);
        controller.enqueue(
          encoder.encode(
            "\n\nSomething went wrong on my end. Try asking again.",
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
    },
  });
}
