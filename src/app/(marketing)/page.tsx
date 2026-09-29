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
              <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
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

      {/* The front door has been student-only since it was built, which was
          right when students were the only audience. There are now four, and
          three of them had nowhere to land: a flight instructor who hears about
          this and visits sees a ground school for teenagers and leaves. That is
          a recruiting channel going unused while the content review queue waits
          on exactly those people. */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="text-2xl font-semibold text-balance">
            It takes more than a website
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl text-pretty">
            Most students here have never met a pilot. The fastest thing that
            changes that is a working aviator standing in their classroom for
            forty-five minutes.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <article className="border-border bg-card flex flex-col gap-2 rounded-lg border p-6">
              <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
                Flight instructors
              </span>
              <h3 className="text-lg font-semibold">Keep us honest</h3>
              <p className="text-muted-foreground flex-1 text-sm text-pretty">
                Nothing we teach reaches a student until a certificated
                instructor has read it. If you hold a CFI or ground instructor
                certificate, that is the job — and you can visit classrooms too.
              </p>
              <Link
                href="/signup?as=cfi"
                className="text-gold-strong mt-2 text-sm font-medium"
              >
                Sign up as a CFI <span aria-hidden>→</span>
              </Link>
            </article>

            <article className="border-border bg-card flex flex-col gap-2 rounded-lg border p-6">
              <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
                Working pilots
              </span>
              <h3 className="text-lg font-semibold">Visit a classroom</h3>
              <p className="text-muted-foreground flex-1 text-sm text-pretty">
                Forty-five minutes in a room, in person or by video. Some of
                those students have never met a pilot, and a few of them will
                decide something about themselves that day.
              </p>
              <Link
                href="/signup?as=pilot"
                className="text-gold-strong mt-2 text-sm font-medium"
              >
                Volunteer <span aria-hidden>→</span>
              </Link>
            </article>

            <article className="border-border bg-card flex flex-col gap-2 rounded-lg border p-6">
              <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
                Teachers and schools
              </span>
              <h3 className="text-lg font-semibold">Ask for a pilot</h3>
              <p className="text-muted-foreground flex-1 text-sm text-pretty">
                Set your school up and ask. Every pilot who visits has had a
                background check, and your students keep the ground school
                afterwards — free, permanently.
              </p>
              <Link
                href="/signup?as=school"
                className="text-gold-strong mt-2 text-sm font-medium"
              >
                Bring one to your class <span aria-hidden>→</span>
              </Link>
            </article>
          </div>
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p>
            PilotPathway.ai — the digital evolution of Fly Compton Foundation, a
            project of Equity Engine, a 501(c)(3) nonprofit.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/privacy" className="hover:text-foreground underline">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground underline">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-foreground underline">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
