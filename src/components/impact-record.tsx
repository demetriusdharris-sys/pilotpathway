import type { ImpactRecord } from "@/lib/visits";

/**
 * What somebody has done — a record, never a ranking.
 *
 * The business rules forbid a mentor leaderboard, because it turns a supportive
 * community competitive and punishes whoever took the hardest assignment: the
 * pilot who drives three hours to a rural school loses to one doing eight easy
 * visits near home. So there is no ordering here, no comparison, and no hint
 * that anyone else's numbers exist.
 *
 * Every figure comes from a visit the school marked as done, with a headcount the
 * school entered. That is what makes it worth putting on a professional record.
 */
export function ImpactPanel({
  record,
  audience,
}: {
  record: ImpactRecord;
  audience: "pilot" | "school";
}) {
  if (record.visits === 0) {
    return (
      <p className="text-muted-foreground mt-2 text-sm text-pretty">
        {audience === "pilot"
          ? "Nothing yet. Once a school marks a visit as done, it shows up here — and the headcount is theirs, not yours, which is what makes it worth showing anyone."
          : "Nothing yet. Once you record a visit as done, it shows up here."}
      </p>
    );
  }

  const hours = Math.round((record.minutes / 60) * 10) / 10;

  return (
    <>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Figure
          label={audience === "pilot" ? "Classrooms visited" : "Visits hosted"}
          value={record.visits}
        />
        <Figure label="Students in the room" value={record.studentsReached} />
        {record.minutes > 0 ? (
          <Figure label="Hours given" value={hours} />
        ) : null}
        <Figure
          label={audience === "pilot" ? "Schools reached" : "Pilots who came"}
          value={record.partners}
        />
      </dl>

      {record.firstVisit ? (
        <p className="text-muted-foreground mt-3 text-xs text-pretty">
          {audience === "pilot" ? "Your first was " : "The first was "}
          {record.firstVisit.slice(0, 10)}
          {record.latestVisit && record.latestVisit !== record.firstVisit
            ? `, the most recent ${record.latestVisit.slice(0, 10)}`
            : ""}
          . Every headcount here was entered by the school.
        </p>
      ) : null}
    </>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
