import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assemblePracticeTest,
  FULL_TEST_QUESTIONS,
  QUICK_TEST_QUESTIONS,
  type CanonicalChoice,
} from "@/lib/practice/assemble";

/**
 * Starting, saving, and submitting a practice attempt.
 *
 * Everything here runs server-side with the service role, and every function
 * takes the student id the caller read from `getUser()` — never one from a
 * form. The RLS policies in 0022 remain as the backstop for anything that
 * reaches the database another way.
 *
 * The answer key never travels to the browser. A saved selection is stored
 * ungraded; grading happens once, inside `submit_practice_attempt`, when the
 * student says they are finished.
 */

/**
 * From the FAA Airman Knowledge Testing Matrix, revised 22 October 2025: the
 * Private Pilot Airplane (PAR) test is 60 scored questions, 2.0 hours, passing
 * score 70. The allotted time was reduced from 2.5 hours in April 2023, which
 * is why older sources disagree.
 *
 * Confirm against the matrix before trusting it — the FAA's site refuses
 * automated readers, so this came from two independent secondary readings of
 * it rather than from the document itself.
 */
export const FULL_TEST_MINUTES = 120;
export const PASSING_PERCENT = 70;

export type PracticeMode = "full_60" | "quick_20" | "targeted";

export type AttemptQuestion = {
  position: number;
  questionId: string;
  stem: string;
  /** In display order. The student never sees the canonical letters. */
  choices: { position: number; text: string }[];
  figureRef: string | null;
  figureSupplement: string | null;
  /** Which displayed position this student has already chosen, if any. */
  selectedPosition: number | null;
};

export type ActiveAttempt = {
  id: string;
  mode: PracticeMode;
  target: string | null;
  startedAt: string;
  completedAt: string | null;
  questionCount: number;
  questions: AttemptQuestion[];
};

type Row = Record<string, unknown>;

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isChoiceOrder(value: string): boolean {
  return /^[ABC]{3}$/.test(value) && new Set(value).size === 3;
}

/** Display position (1-based) → the canonical letter shown there. */
function letterAt(
  choiceOrder: string,
  position: number,
): CanonicalChoice | null {
  const letter = choiceOrder[position - 1];
  return letter === "A" || letter === "B" || letter === "C" ? letter : null;
}

function positionOf(choiceOrder: string, letter: string): number | null {
  const index = choiceOrder.indexOf(letter);
  return index === -1 ? null : index + 1;
}

export class PracticeError extends Error {}

/**
 * Builds an attempt and writes it down before the student sees a question.
 *
 * The whole test is fixed at this moment — which questions, in which order,
 * with which choice order — so a refresh, a dropped connection, or a phone
 * that sleeps mid-test resumes exactly the same paper. Assembling on each
 * render would quietly give them a different test every time they reloaded.
 */
export async function startAttempt(
  supabase: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
  mode: PracticeMode,
  target?: string,
): Promise<string> {
  if (mode === "targeted" && !target) {
    throw new PracticeError("Choose an area to practise.");
  }

  const plan = await assemblePracticeTest(supabase, userId, { mode, target });

  if (plan.questions.length === 0) {
    throw new PracticeError(
      "There are no approved questions available yet. Practice tests open as soon as a flight instructor has reviewed them.",
    );
  }

  // A short test is honest; a test that silently drops half the areas is not.
  const wanted =
    mode === "full_60"
      ? FULL_TEST_QUESTIONS
      : mode === "quick_20"
        ? QUICK_TEST_QUESTIONS
        : QUICK_TEST_QUESTIONS;

  const { data: attemptRow, error: attemptError } = await admin
    .from("practice_attempts")
    .insert({
      user_id: userId,
      mode,
      target: target ?? null,
      question_count: plan.questions.length,
    })
    .select("id")
    .single();

  if (attemptError || !attemptRow) {
    throw new PracticeError(
      `Could not start the test: ${attemptError?.message ?? "no attempt created"}`,
    );
  }

  const attemptId = text(attemptRow.id);

  if (!attemptId) {
    throw new PracticeError("Could not start the test.");
  }

  const { error: answersError } = await admin.from("practice_answers").insert(
    plan.questions.map((entry) => ({
      attempt_id: attemptId,
      question_id: entry.question.id,
      position: entry.position,
      choice_order: entry.choiceOrder,
    })),
  );

  if (answersError) {
    // An attempt with no questions is a dead end the student would sit
    // staring at. Roll it back rather than leave it.
    await admin.from("practice_attempts").delete().eq("id", attemptId);
    throw new PracticeError(
      `Could not start the test: ${answersError.message}`,
    );
  }

  if (plan.questions.length < wanted) {
    console.info("Practice attempt started short of a full test:", {
      userId,
      attemptId,
      mode,
      wanted,
      supplied: plan.questions.length,
    });
  }

  return attemptId;
}

/**
 * The attempt as the student should see it: questions, choices in the stored
 * display order, and anything already answered. No correct answers, no
 * explanations, no correctness.
 */
export async function loadAttempt(
  admin: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<ActiveAttempt | null> {
  const { data: attempt, error: attemptError } = await admin
    .from("practice_attempts")
    .select(
      "id, user_id, mode, target, started_at, completed_at, question_count",
    )
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (attemptError) {
    throw new PracticeError(`Could not load the test: ${attemptError.message}`);
  }

  if (!attempt) return null;

  const { data: answers, error: answersError } = await admin
    .from("practice_answers")
    .select("position, question_id, selected_choice, choice_order")
    .eq("attempt_id", attemptId)
    .order("position");

  if (answersError) {
    throw new PracticeError(`Could not load the test: ${answersError.message}`);
  }

  const questionIds = ((answers ?? []) as Row[])
    .map((row) => text(row.question_id))
    .filter((id): id is string => id !== null);

  const { data: questions, error: questionError } = await admin
    .from("question_bank")
    .select(
      "id, stem, choice_a, choice_b, choice_c, figure_ref, figure_supplement",
    )
    .in("id", questionIds.length > 0 ? questionIds : [""]);

  if (questionError) {
    throw new PracticeError(
      `Could not load the test: ${questionError.message}`,
    );
  }

  const byId = new Map<string, Row>();
  for (const row of (questions ?? []) as Row[]) {
    const id = text(row.id);
    if (id) byId.set(id, row);
  }

  const built: AttemptQuestion[] = [];

  for (const row of (answers ?? []) as Row[]) {
    const questionId = text(row.question_id);
    const choiceOrder = text(row.choice_order);
    const position = typeof row.position === "number" ? row.position : null;

    if (!questionId || !choiceOrder || position === null) continue;
    if (!isChoiceOrder(choiceOrder)) continue;

    const question = byId.get(questionId);
    const stem = text(question?.stem);

    if (!question || !stem) continue;

    const canonical: Record<CanonicalChoice, string | null> = {
      A: text(question.choice_a),
      B: text(question.choice_b),
      C: text(question.choice_c),
    };

    const choices: AttemptQuestion["choices"] = [];
    for (let slot = 1; slot <= 3; slot += 1) {
      const letter = letterAt(choiceOrder, slot);
      const value = letter ? canonical[letter] : null;
      if (value !== null) choices.push({ position: slot, text: value });
    }

    const selected = text(row.selected_choice);

    built.push({
      position,
      questionId,
      stem,
      choices,
      figureRef: text(question.figure_ref),
      figureSupplement: text(question.figure_supplement),
      selectedPosition: selected ? positionOf(choiceOrder, selected) : null,
    });
  }

  return {
    id: attemptId,
    mode: (text(attempt.mode) ?? "quick_20") as PracticeMode,
    target: text(attempt.target),
    startedAt: text(attempt.started_at) ?? new Date().toISOString(),
    completedAt: text(attempt.completed_at),
    questionCount:
      typeof attempt.question_count === "number"
        ? attempt.question_count
        : built.length,
    questions: built,
  };
}

/**
 * Saves one selection, immediately.
 *
 * The student sends a DISPLAY POSITION, never a letter — they do not know the
 * letters, and the mapping lives on the row. Saving per selection is what
 * makes a dropped connection survivable on a phone: at worst the student loses
 * the question they were on.
 */
export async function saveSelection(
  admin: SupabaseClient,
  userId: string,
  attemptId: string,
  questionPosition: number,
  choicePosition: number | null,
  secondsSpent?: number,
): Promise<void> {
  const { data: attempt, error: attemptError } = await admin
    .from("practice_attempts")
    .select("id, completed_at")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (attemptError) {
    throw new PracticeError(`Could not save that: ${attemptError.message}`);
  }
  if (!attempt) {
    throw new PracticeError("That test is not yours.");
  }
  if (text(attempt.completed_at) !== null) {
    throw new PracticeError("That test has already been submitted.");
  }

  const { data: row, error: rowError } = await admin
    .from("practice_answers")
    .select("id, choice_order")
    .eq("attempt_id", attemptId)
    .eq("position", questionPosition)
    .maybeSingle();

  if (rowError || !row) {
    throw new PracticeError("That question is not part of this test.");
  }

  const choiceOrder = text(row.choice_order) ?? "ABC";

  const selected =
    choicePosition === null ? null : letterAt(choiceOrder, choicePosition);

  if (choicePosition !== null && selected === null) {
    throw new PracticeError("That answer is not one of the choices.");
  }

  const { error: writeError } = await admin
    .from("practice_answers")
    .update({
      selected_choice: selected,
      answered_at: selected === null ? null : new Date().toISOString(),
      seconds_spent:
        typeof secondsSpent === "number" && secondsSpent >= 0
          ? Math.round(secondsSpent)
          : null,
    })
    .eq("id", row.id);

  if (writeError) {
    throw new PracticeError(`Could not save that: ${writeError.message}`);
  }
}

export type AttemptResult = {
  attemptId: string;
  mode: PracticeMode;
  completedAt: string;
  rawScore: number;
  questionCount: number;
  percent: number;
  passed: boolean;
  /** Mirrors the Airman Knowledge Test Report: the codes a student missed. */
  missedAcsCodes: { acsCode: string; knowledgeArea: string; missed: number }[];
  byArea: { area: string; correct: number; asked: number }[];
  review: {
    position: number;
    /** Needed so a student can report a question that looks wrong. */
    questionId: string;
    stem: string;
    acsCode: string;
    knowledgeArea: string;
    yourAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean | null;
    explanation: string;
    figureRef: string | null;
    figureSupplement: string | null;
  }[];
};

/** Grades and closes the attempt, then reads back what to show. */
export async function submitAttempt(
  admin: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<void> {
  const { error } = await admin.rpc("submit_practice_attempt", {
    p_attempt_id: attemptId,
    p_user_id: userId,
  });

  if (error) {
    throw new PracticeError(`Could not submit the test: ${error.message}`);
  }
}

/**
 * The results, read with the service role because this is the only place the
 * answer key and the explanations are allowed out — and only for a completed
 * attempt belonging to this student.
 */
export async function loadResult(
  admin: SupabaseClient,
  userId: string,
  attemptId: string,
): Promise<AttemptResult | null> {
  const { data: attempt, error: attemptError } = await admin
    .from("practice_attempts")
    .select("id, mode, completed_at, raw_score, question_count")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();

  if (attemptError) {
    throw new PracticeError(
      `Could not load the result: ${attemptError.message}`,
    );
  }

  const completedAt = text(attempt?.completed_at);

  if (!attempt || !completedAt) return null;

  const { data: answers, error: answersError } = await admin
    .from("practice_answers")
    .select("position, question_id, selected_choice, is_correct, choice_order")
    .eq("attempt_id", attemptId)
    .order("position");

  if (answersError) {
    throw new PracticeError(
      `Could not load the result: ${answersError.message}`,
    );
  }

  const answerRows = (answers ?? []) as Row[];
  const questionIds = answerRows
    .map((row) => text(row.question_id))
    .filter((id): id is string => id !== null);

  const { data: questions, error: questionError } = await admin
    .from("question_bank")
    .select(
      "id, stem, choice_a, choice_b, choice_c, correct_choice, explanation, acs_code, knowledge_area, figure_ref, figure_supplement",
    )
    .in("id", questionIds.length > 0 ? questionIds : [""]);

  if (questionError) {
    throw new PracticeError(
      `Could not load the result: ${questionError.message}`,
    );
  }

  const byId = new Map<string, Row>();
  for (const row of (questions ?? []) as Row[]) {
    const id = text(row.id);
    if (id) byId.set(id, row);
  }

  const review: AttemptResult["review"] = [];
  const missedByCode = new Map<
    string,
    { knowledgeArea: string; missed: number }
  >();
  const areaTally = new Map<string, { correct: number; asked: number }>();

  for (const row of answerRows) {
    const questionId = text(row.question_id);
    const position = typeof row.position === "number" ? row.position : null;
    if (!questionId || position === null) continue;

    const question = byId.get(questionId);
    if (!question) continue;

    const canonical: Record<string, string | null> = {
      A: text(question.choice_a),
      B: text(question.choice_b),
      C: text(question.choice_c),
    };

    const correctLetter = text(question.correct_choice) ?? "A";
    const selectedLetter = text(row.selected_choice);
    const acsCode = text(question.acs_code) ?? "—";
    const knowledgeArea = text(question.knowledge_area) ?? "—";
    const isCorrect =
      typeof row.is_correct === "boolean" ? row.is_correct : null;

    const area = areaTally.get(knowledgeArea) ?? { correct: 0, asked: 0 };
    area.asked += 1;
    if (isCorrect === true) area.correct += 1;
    areaTally.set(knowledgeArea, area);

    if (isCorrect !== true) {
      const entry = missedByCode.get(acsCode) ?? { knowledgeArea, missed: 0 };
      entry.missed += 1;
      missedByCode.set(acsCode, entry);
    }

    review.push({
      position,
      questionId,
      stem: text(question.stem) ?? "",
      acsCode,
      knowledgeArea,
      yourAnswer: selectedLetter ? canonical[selectedLetter] : null,
      correctAnswer: canonical[correctLetter] ?? "",
      isCorrect,
      explanation: text(question.explanation) ?? "",
      figureRef: text(question.figure_ref),
      figureSupplement: text(question.figure_supplement),
    });
  }

  const rawScore =
    typeof attempt.raw_score === "number" ? attempt.raw_score : 0;
  const questionCount =
    typeof attempt.question_count === "number"
      ? attempt.question_count
      : review.length;
  const percent =
    questionCount === 0 ? 0 : Math.round((rawScore / questionCount) * 100);

  return {
    attemptId,
    mode: (text(attempt.mode) ?? "quick_20") as PracticeMode,
    completedAt,
    rawScore,
    questionCount,
    percent,
    passed: percent >= PASSING_PERCENT,
    missedAcsCodes: [...missedByCode.entries()]
      .map(([acsCode, entry]) => ({ acsCode, ...entry }))
      .sort(
        (a, b) => b.missed - a.missed || a.acsCode.localeCompare(b.acsCode),
      ),
    byArea: [...areaTally.entries()]
      .map(([area, tally]) => ({ area, ...tally }))
      .sort((a, b) => a.correct / a.asked - b.correct / b.asked),
    review,
  };
}

/** Past attempts, newest first, for the practice home page. */
export async function loadAttemptHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 10,
): Promise<
  {
    id: string;
    mode: PracticeMode;
    target: string | null;
    startedAt: string;
    completedAt: string | null;
    rawScore: number | null;
    questionCount: number;
  }[]
> {
  const { data, error } = await supabase
    .from("practice_attempts")
    .select(
      "id, mode, target, started_at, completed_at, raw_score, question_count",
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new PracticeError(`Could not load your tests: ${error.message}`);
  }

  const history = [];

  for (const row of (data ?? []) as Row[]) {
    const id = text(row.id);
    if (!id) continue;

    history.push({
      id,
      mode: (text(row.mode) ?? "quick_20") as PracticeMode,
      target: text(row.target),
      startedAt: text(row.started_at) ?? "",
      completedAt: text(row.completed_at),
      rawScore: typeof row.raw_score === "number" ? row.raw_score : null,
      questionCount:
        typeof row.question_count === "number" ? row.question_count : 0,
    });
  }

  return history;
}
