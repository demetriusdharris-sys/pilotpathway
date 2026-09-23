export const metadata = {
  title: "Contact — PilotPathway.ai",
};

/**
 * A published address rather than a form, on purpose.
 *
 * A form needs somewhere to deliver to, spam handling, and a way for us to
 * reply — three things that can silently fail, leaving a student who reported
 * a problem believing they were heard. An email address cannot fail quietly,
 * and it gives the student a copy of what they sent.
 */
export default function ContactPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Contact</h1>
      <p className="text-muted-foreground">
        A real person reads these. PilotPathway.ai is a project of Equity
        Engine, a 501(c)(3) nonprofit.
      </p>

      <p>
        Write to{" "}
        <a
          href="mailto:demetrius@pilotpathway.ai"
          className="font-medium underline"
        >
          demetrius@pilotpathway.ai
        </a>{" "}
        — for anything at all, including the things below.
      </p>

      <h2>Something is broken</h2>
      <p>
        Tell us what you were doing, what you expected, and what happened
        instead. If you can, say roughly when it happened and what device you
        were on — that is usually enough for us to find it in the logs. A
        screenshot helps and is never required.
      </p>

      <h2>Something the tutor said looks wrong</h2>
      <p>
        Please tell us, and tell your instructor. Quote what it said and which
        lesson you were on. An AI stating a regulation incorrectly is the most
        serious kind of bug this product can have, and we would rather hear
        about ten that turn out to be fine than miss one that is not.
      </p>

      <h2>You are a parent or guardian</h2>
      <p>
        Questions about your student&apos;s account, what a school can see, or
        removing their data go to the same address. Say that you are a guardian
        and we will prioritise it.
      </p>

      <h2>You are a school, a flight school, or a funder</h2>
      <p>
        Same address. Tell us roughly how many students you are thinking about
        and what you would need to see to take it seriously.
      </p>

      <h2>What to expect</h2>
      <p>
        This is a small project, so replies come from a person rather than a
        queue. Anything involving a student&apos;s safety or their data goes to
        the front of the line.
      </p>
    </>
  );
}
