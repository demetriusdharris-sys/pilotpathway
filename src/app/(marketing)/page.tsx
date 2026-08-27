import Link from "next/link";
import { Button } from "@/components/ui/button";

const stages = [
  {
    label: "Stage 1",
    title: "Foundations & Pre-Solo",
    body: "Aerodynamics, systems, airport operations, radio comms, FAR/AIM essentials, preflight, human factors, and weather basics.",
  },
  {
    label: "Stage 2",
    title: "Solo & Cross-Country",
    body: "Navigation, practical weather, cross-country planning, night operations, and solo cross-country knowledge.",
  },
  {
    label: "Stage 3",
    title: "Checkride Ready",
    body: "ACS oral prep, scenario-based judgment, knowledge test review, and stage check readiness.",
  },
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-20 sm:py-28">
          <p className="text-gold text-sm font-semibold tracking-[0.2em] uppercase">
            PilotPathway.ai
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold text-balance sm:text-6xl">
            Flight training that starts with{" "}
            <span className="text-gold">you belong here</span>.
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl text-lg text-pretty">
            An adaptive Private Pilot ground school with an AI flight instructor
            that teaches the way a good CFI does — by asking, not lecturing. FAA
            standards stay exact. The path in gets wider.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="bg-gold text-gold-foreground hover:bg-gold/90"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
            <p className="text-primary-foreground/70 text-sm">
              Free core ground school. No credit card.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-6 py-16 sm:py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          A Part 141-style curriculum, in three stages
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl text-pretty">
          You study the ground with us. A human CFI still flies with you and
          signs your endorsements — that never changes.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {stages.map((stage) => (
            <article
              key={stage.label}
              className="border-border bg-card flex flex-col gap-2 rounded-lg border p-6"
            >
              <span className="text-gold text-xs font-semibold tracking-[0.15em] uppercase">
                {stage.label}
              </span>
              <h3 className="text-lg font-semibold">{stage.title}</h3>
              <p className="text-muted-foreground text-sm text-pretty">
                {stage.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto max-w-5xl px-6 py-8 text-sm">
          PilotPathway.ai — the digital evolution of Fly Compton Foundation.
        </div>
      </footer>
    </main>
  );
}
