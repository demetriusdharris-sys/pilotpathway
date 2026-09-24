import type { Lesson, Stage } from "@/lib/curriculum";
import type { LatestObjectiveSignal } from "@/lib/objective-signals-read";
import type { PracticeEvidence } from "@/lib/practice/tutor-evidence";
import type { ProgressBySlug } from "@/lib/progress";

/**
 * Everything the mastery summary is derived from.
 *
 * Deliberately a typed input object rather than loose arguments: when
 * per-objective mastery exists (quiz results, graded checks), it becomes a new
 * field here and a new paragraph below. The call site in the tutor route does
 * not change.
 */
export type MasterySignals = {
  stage: Stage;
  lesson: Lesson;
  progress: ProgressBySlug;
  priorMessagesInLesson: number;
  /**
   * Optional. Conversation-inferred readings, newest per objective. Absent or
   * empty means the tutor is told nothing about per-objective mastery, which
   * is the correct behaviour before any signals exist.
   */
  signals?: LatestObjectiveSignal[];
  /**
   * Optional. Scored practice-test results for this lesson's objectives. Unlike
   * `signals` this is marked evidence rather than the tutor's own read of a
   * conversation, which is why it is stated more firmly below — and why it is
   * allowed to decide whether the tutor explains or elicits.
   */
  practice?: PracticeEvidence[];
};

/**
 * A coarse mastery summary from what actually exists today: self-marked lesson
 * progress, and whether this student has talked in this lesson before.
 *
 * The honesty caveat at the end matters. A student clicking "Mark complete"
 * is a claim, not a demonstration. Without saying so, the tutor treats a
 * checkbox as evidence of knowledge and skips things the student never
 * learned -- which, on stall recognition or fuel planning, is not a harmless
 * mistake.
 */
/** How a reading reads to the instructor, in plain language. */
const READING_PHRASE = {
  solid: "Solid on",
  shaky: "Shaky on",
  missing: "Showed a gap on",
} as const;

export function buildMasteryNotes(input: MasterySignals): string {
  const {
    stage,
    lesson,
    progress,
    priorMessagesInLesson,
    signals: objectiveSignals,
    practice,
  } = input;

  const lines: string[] = [];

  const currentStatus = progress.get(lesson.slug) ?? "not_started";
  const statusText =
    currentStatus === "completed"
      ? "has marked this lesson complete"
      : currentStatus === "in_progress"
        ? "has this lesson marked in progress"
        : "has not started this lesson yet";
  lines.push(`This student ${statusText}.`);

  const completed = stage.lessons.filter(
    (item) => progress.get(item.slug) === "completed",
  );
  const inProgress = stage.lessons.filter(
    (item) => progress.get(item.slug) === "in_progress",
  );

  lines.push(
    `Stage ${stage.number} progress: ${completed.length} of ${stage.lessons.length} lessons marked complete.`,
  );

  if (completed.length > 0) {
    // Earlier lessons only. Something marked complete later in the sequence is
    // not useful ground to build on when teaching this one.
    const currentIndex = stage.lessons.findIndex(
      (item) => item.slug === lesson.slug,
    );
    const earlierDone = completed
      .filter((item) => stage.lessons.indexOf(item) < currentIndex)
      .slice(-4)
      .map((item) => item.title);

    if (earlierDone.length > 0) {
      lines.push(
        `Earlier lessons they have marked complete: ${earlierDone.join("; ")}. You may build on these, but confirm before relying on them.`,
      );
    }
  }

  if (inProgress.length > 0) {
    const names = inProgress
      .filter((item) => item.slug !== lesson.slug)
      .slice(0, 3)
      .map((item) => item.title);
    if (names.length > 0) {
      lines.push(`Currently mid-way through: ${names.join("; ")}.`);
    }
  }

  if (priorMessagesInLesson === 0) {
    lines.push("This is their first conversation with you in this lesson.");
  } else {
    lines.push(
      `You have exchanged ${priorMessagesInLesson} messages with them in this lesson before. Continue where you left off rather than restarting the lesson.`,
    );
  }

  lines.push(
    "Caveat: lesson status is self-reported by the student, not a demonstrated result. Treat it as where they think they are, not proof of what they know. Check understanding before assuming it.",
  );

  // Per-objective readings, when any exist. Everything below is skipped
  // entirely when there are none -- no header, no label, no empty list.
  const byObjectiveId = new Map(
    (objectiveSignals ?? []).map((signal) => [signal.objectiveId, signal]),
  );

  if (byObjectiveId.size > 0) {
    // Walked in lesson order rather than signal order, so the tutor reads them
    // in the sequence it teaches them. A signal for an objective that is not
    // in this lesson is ignored.
    const readObjectives = lesson.objectives.flatMap((objective) => {
      const signal = byObjectiveId.get(objective.id);
      return signal ? [{ objective, signal }] : [];
    });

    for (const { objective, signal } of readObjectives) {
      lines.push(
        `${READING_PHRASE[signal.reading]} "${objective.text}" (${signal.confidence} confidence).`,
      );
    }

    const shakySafetyCritical = readObjectives.filter(
      ({ objective, signal }) =>
        objective.isSafetyCritical &&
        (signal.reading === "shaky" || signal.reading === "missing"),
    );

    if (shakySafetyCritical.length > 0) {
      const names = shakySafetyCritical
        .map(({ objective }) => `"${objective.text}"`)
        .join("; ");
      lines.push(
        `Not yet solid: ${names}. These are safety-critical. Weave them back into the conversation when it fits naturally — do not stop the lesson to drill them, and do not block the student from moving forward.`,
      );
    }

    if (readObjectives.length > 0) {
      lines.push(
        "Caveat: these readings are one model's read of earlier conversations, not a scored result. Treat them as where to check, not as proof of what the student knows.",
      );
    }
  }

  // Scored practice-test results, when any exist for this lesson's objectives.
  //
  // Stated more firmly than the signals above because it is marked evidence
  // rather than an impression, and it is the one input allowed to decide whether
  // this turn explains or elicits — which is what the TEACHING APPROACH block in
  // the system prompt already keys off, so nothing in that prompt had to change.
  //
  // Counts only. No readiness verdict crosses this boundary: Captain Path does
  // not judge whether a student is ready for a test or a checkride, and a
  // percentage per objective is a fact about answers rather than a judgement
  // about a person.
  const scored = (practice ?? []).flatMap((entry) => {
    const objective = lesson.objectives.find(
      (item) => item.id === entry.objectiveId,
    );
    return objective ? [{ objective, entry }] : [];
  });

  if (scored.length > 0) {
    for (const { objective, entry } of scored) {
      lines.push(
        entry.isWeak
          ? `Scored ${entry.correct} of ${entry.answered} on "${objective.text}" in practice tests. Teach this before asking them to reason about it.`
          : `Scored ${entry.correct} of ${entry.answered} on "${objective.text}" in practice tests. You may ask before explaining here.`,
      );
    }

    const weakSafetyCritical = scored.filter(
      ({ objective, entry }) => objective.isSafetyCritical && entry.isWeak,
    );

    if (weakSafetyCritical.length > 0) {
      const names = weakSafetyCritical
        .map(({ objective }) => `"${objective.text}"`)
        .join("; ");
      lines.push(
        `Safety-critical and scored badly: ${names}. Cover these properly in this lesson rather than leaving them to the next practice test.`,
      );
    }

    lines.push(
      "These practice results are scored answers, not an impression — treat them as real evidence of what the student could and could not do. They say nothing about whether the student is ready for the knowledge test or a checkride, and you must not offer a view on that.",
    );
  }

  return lines.join(" ");
}
