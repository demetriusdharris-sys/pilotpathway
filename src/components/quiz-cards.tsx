"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  submitAnswer,
  type AnswerState,
} from "@/app/(dashboard)/stages/[stage]/[lesson]/quiz-actions";
import type { QuizCard } from "@/lib/quiz-cards";

function CheckButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "Checking…" : "Check answer"}
    </Button>
  );
}

function Card({
  card,
  index,
  total,
  onAnswered,
}: {
  card: QuizCard;
  index: number;
  total: number;
  onAnswered: (correct: boolean) => void;
}) {
  const [state, formAction] = useActionState<AnswerState, FormData>(
    async (prev, formData) => {
      const result = await submitAnswer(prev, formData);
      if (result.cardId === card.id && result.isCorrect !== undefined) {
        onAnswered(result.isCorrect);
      }
      return result;
    },
    {},
  );

  const [chosen, setChosen] = useState<string | null>(null);

  // Only trust a result that belongs to this card.
  const answered = state.cardId === card.id && state.isCorrect !== undefined;

  return (
    <li className="border-border bg-card rounded-lg border p-5">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
        Question {index + 1} of {total}
      </span>
      <form action={formAction} className="mt-2 flex flex-col gap-3">
        <input type="hidden" name="cardId" value={card.id} />

        {/* The question is the legend of the option group, not a separate
            paragraph above it. A screen reader then announces it on entering
            the group, so each choice is heard as an answer to this question
            rather than as a free-floating option. */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-base font-medium text-pretty">
            {card.question}
          </legend>

          <div className="flex flex-col gap-2">
            {card.options.map((option) => {
              const isChosen = chosen === option.optionId;
              const showAsChosen = answered
                ? state.chosenOptionId === option.optionId
                : isChosen;

              return (
                <label
                  key={option.optionId}
                  className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 text-sm text-pretty transition-colors ${
                    showAsChosen
                      ? "border-gold bg-gold/10"
                      : "border-border hover:bg-muted/50"
                  } ${answered ? "cursor-default" : ""}`}
                >
                  <input
                    type="radio"
                    name="optionId"
                    value={option.optionId}
                    checked={isChosen}
                    disabled={answered}
                    onChange={() => setChosen(option.optionId)}
                    className="mt-1"
                  />
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {answered ? (
          <div
            role="status"
            className={`rounded-md border px-3 py-2 text-sm text-pretty ${
              state.isCorrect
                ? "border-border bg-secondary text-secondary-foreground"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <p className="font-medium">
              {state.isCorrect ? "That's right." : "Not quite."}
            </p>
            {state.explanation ? (
              <p className="mt-2 text-foreground">{state.explanation}</p>
            ) : null}
          </div>
        ) : null}

        {state.error ? (
          <p
            role="alert"
            className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          >
            {state.error}
          </p>
        ) : null}

        {answered ? null : (
          <div>
            <CheckButton disabled={chosen === null} />
          </div>
        )}
      </form>
    </li>
  );
}

export function QuizCards({ cards }: { cards: QuizCard[] }) {
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);

  if (cards.length === 0) {
    return null;
  }

  function record(wasCorrect: boolean) {
    setAnswered((n) => n + 1);
    if (wasCorrect) setCorrect((n) => n + 1);
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
          Check yourself
        </h2>
        {answered > 0 ? (
          <p className="text-muted-foreground text-sm">
            {correct} of {answered} so far
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground mt-3 text-sm text-pretty">
        These count toward your record. Getting one wrong is how you find out
        what to ask your instructor about — it is not a mark against you.
      </p>

      <ol className="mt-5 flex flex-col gap-4">
        {cards.map((card, index) => (
          <Card
            key={card.id}
            card={card}
            index={index}
            total={cards.length}
            onAnswered={record}
          />
        ))}
      </ol>
    </section>
  );
}
