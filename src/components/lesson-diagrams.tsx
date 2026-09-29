import { hasDiagram, renderDiagram } from "@/components/diagrams";
import type { LessonDiagram } from "@/lib/diagrams/load";

/**
 * The pictures on a lesson.
 *
 * A key in the database with no drawing behind it renders nothing rather than
 * an empty frame with a caption under it — the caption would then describe
 * something that is not there, which is worse than silence.
 */
export function LessonDiagrams({ diagrams }: { diagrams: LessonDiagram[] }) {
  const drawable = diagrams.filter((diagram) => hasDiagram(diagram.key));

  if (drawable.length === 0) return null;

  return (
    <section className="mt-10 flex flex-col gap-8">
      {drawable.map((diagram) => (
        <figure key={diagram.key}>
          <h2 className="text-sm font-semibold tracking-[0.15em] uppercase">
            {diagram.title}
          </h2>
          <div className="border-border bg-card mt-3 rounded-lg border p-5">
            {renderDiagram(diagram.key)}
          </div>
          <figcaption className="text-muted-foreground mt-3 text-sm text-pretty">
            {diagram.caption}
          </figcaption>
        </figure>
      ))}
    </section>
  );
}
