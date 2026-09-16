import type { Lesson } from "@/lib/curriculum";

/**
 * The canned prompts shown as buttons before a student's first message in a
 * lesson.
 *
 * Defined once, here, because two places depend on the exact wording: the
 * lesson page renders them, and the tutor route recognises them so it can skip
 * the objective-signal judge. If the wording lived in two places, editing one
 * would silently make the route stop recognising a starter and resume paying
 * for a judge that has nothing to read.
 */
export function tutorStarters(lesson: Lesson): string[] {
  return [
    "Start this lesson. Teach the objective. Ask me one question.",
    "Explain this like I've never flown before",
    `Quiz me on ${lesson.title.toLowerCase()}`,
  ];
}

/**
 * Whether a message is one of this lesson's starter prompts, verbatim.
 *
 * Decided on the server by comparing text, not by a flag the browser sends:
 * nothing about skipping the judge should depend on what a client claims. A
 * student who types the identical sentence themselves has still said nothing
 * about what they know, so treating it as a starter is correct either way.
 */
export function isStarterPrompt(message: string, lesson: Lesson): boolean {
  const text = message.trim();
  return tutorStarters(lesson).some((starter) => starter === text);
}
