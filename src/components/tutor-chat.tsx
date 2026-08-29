"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TutorMessage } from "@/lib/tutor";

type TutorChatProps = {
  stageSlug: string;
  lessonSlug: string;
  starters: string[];
  /** Prior conversation for this lesson, loaded server-side on page render. */
  initialMessages: TutorMessage[];
};

export function TutorChat({
  stageSlug,
  lessonSlug,
  starters,
  initialMessages,
}: TutorChatProps) {
  const [messages, setMessages] = useState<TutorMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const question = text.trim();
    if (!question || streaming) return;

    const next: TutorMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(next);
    setInput("");
    setError(null);
    setStreaming(true);

    try {
      // Only the new question goes over the wire. History is loaded from the
      // database server-side, so the client cannot forge it.
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, stageSlug, lessonSlug }),
      });

      if (!response.ok || !response.body) {
        const detail = await response.json().catch(() => null);

        // 429 is not a failure — the student hit today's practice cap. Say so
        // plainly and stop offering an input they cannot use.
        if (response.status === 429) {
          setLimitReached(true);
          setError(
            detail?.error ??
              "You've reached today's practice limit with your instructor. It resets tomorrow.",
          );
          setMessages(messages);
          setStreaming(false);
          return;
        }

        setError(detail?.error ?? "Could not reach your instructor.");
        setMessages(messages);
        setStreaming(false);
        return;
      }

      setMessages([...next, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
        endRef.current?.scrollIntoView({ block: "end" });
      }
    } catch {
      setError("Lost connection. Try again.");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="border-border bg-card mt-12 rounded-lg border p-5">
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
        Ask your instructor
      </h2>
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        Your AI ground instructor. It teaches by asking — expect questions
        back. Your CFI still signs everything.
      </p>

      {messages.length === 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {starters.map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => send(starter)}
              className="border-border hover:bg-accent rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
            >
              {starter}
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={
                message.role === "user"
                  ? "bg-secondary text-secondary-foreground ml-auto max-w-[85%] rounded-lg px-4 py-2.5 text-sm"
                  : "max-w-[95%] text-sm"
              }
            >
              {message.role === "assistant" ? (
                <span className="text-gold mb-1 block text-xs font-semibold tracking-[0.15em] uppercase">
                  Instructor
                </span>
              ) : null}
              <p className="whitespace-pre-wrap text-pretty">
                {message.content}
                {streaming &&
                message.role === "assistant" &&
                index === messages.length - 1 ? (
                  <span className="animate-pulse">▍</span>
                ) : null}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {error ? (
        <p
          role={limitReached ? "status" : "alert"}
          className={
            limitReached
              ? "border-border bg-muted text-foreground mt-4 rounded-md border px-3 py-2 text-sm text-pretty"
              : "border-destructive/30 bg-destructive/10 text-destructive mt-4 rounded-md border px-3 py-2 text-sm"
          }
        >
          {error}
          {limitReached ? (
            <span className="text-muted-foreground mt-1 block">
              Nothing is lost — your progress is saved. Come back tomorrow and
              pick up where you left off.
            </span>
          ) : null}
        </p>
      ) : null}

      <form
        className="mt-5 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={
            limitReached ? "Back tomorrow…" : "Ask about this lesson…"
          }
          aria-label="Ask your instructor a question"
          maxLength={4000}
          disabled={limitReached}
          className="border-input bg-background focus-visible:ring-ring flex-1 rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        />
        <Button
          type="submit"
          disabled={streaming || limitReached || !input.trim()}
        >
          {streaming ? "Thinking…" : "Ask"}
        </Button>
      </form>
    </section>
  );
}
