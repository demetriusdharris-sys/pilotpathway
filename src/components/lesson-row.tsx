import Link from "next/link";
import type { Lesson } from "@/lib/curriculum";
import type { LessonStatus } from "@/types/database";

const STATUS_LABEL: Record<LessonStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Complete",
};

const STATUS_STYLE: Record<LessonStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "text-gold",
  completed: "text-foreground",
};

type LessonRowProps = {
  index: number;
  stageSlug: string;
  lesson: Lesson;
  status: LessonStatus;
};

export function LessonRow({
  index,
  stageSlug,
  lesson,
  status,
}: LessonRowProps) {
  return (
    <li>
      <Link
        href={`/stages/${stageSlug}/${lesson.slug}`}
        className="border-border hover:bg-accent focus-visible:ring-ring flex items-start gap-4 rounded-md border px-4 py-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <span
          aria-hidden
          className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
        >
          {index}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-medium">{lesson.title}</span>
          <span className="text-muted-foreground text-sm text-pretty">
            {lesson.summary}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1 text-xs">
          <span className={STATUS_STYLE[status]}>{STATUS_LABEL[status]}</span>
          <span className="text-muted-foreground">
            {lesson.estimatedMinutes} min
          </span>
        </span>
      </Link>
    </li>
  );
}
