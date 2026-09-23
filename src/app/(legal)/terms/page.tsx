import Link from "next/link";

export const metadata = {
  title: "Terms — PilotPathway.ai",
};

/**
 * Deliberately short. The safety-critical part is the disclaimer about what an
 * AI ground instructor is and is not, which carries real weight for a product
 * teaching aviation — everything else is ordinary.
 *
 * **Not reviewed by a lawyer.** Equity Engine should review this before a real
 * beta, since it is their 501(c)(3) taking the obligation.
 */
export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Terms</h1>
      <p className="text-muted-foreground">
        Last updated 23 September 2026. PilotPathway.ai is a project of Equity
        Engine, a 501(c)(3) nonprofit.
      </p>

      <h2>What this is</h2>
      <p>
        PilotPathway is a ground school: it teaches the knowledge behind the
        Private Pilot certificate, and it is free to use. Captain Path is an AI
        ground instructor. It is a study partner, not a flight instructor.
      </p>

      <h2>What it is not — the part that matters</h2>
      <ul>
        <li>
          <strong>Nothing here is a flight instructor endorsement.</strong> Only
          a certificated flight instructor who has flown with you can endorse
          you for solo flight, for a cross-country, or for a practical test. We
          will never tell you that you are ready to fly alone.
        </li>
        <li>
          <strong>
            Nothing here replaces the FAA&apos;s own publications.
          </strong>{" "}
          Regulations and handbooks change. Always confirm what you read here
          against current FAA publications and with your instructor.
        </li>
        <li>
          <strong>The AI can be wrong.</strong> It is built to say when it is
          unsure and to send you to your CFI, but no such system is perfect. If
          something here disagrees with your instructor, your instructor wins.
        </li>
        <li>
          <strong>You are responsible for your own flying.</strong> As pilot in
          command you are the final authority for every flight — a principle we
          teach here because it is true, including about anything you learned
          here.
        </li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 13 to have an account.</li>
        <li>
          Use a real email address you control — it is how you get back in if
          you forget your password.
        </li>
        <li>
          The account is yours. Do not share it, and tell us if you think
          someone else is using it.
        </li>
        <li>
          You can delete your account at any time from your profile, and you do
          not have to tell us why.
        </li>
      </ul>

      <h2>Using it decently</h2>
      <p>
        Do not use the tutor to harass anyone, to generate material unrelated to
        flight training, or to try to break the service for other students. We
        limit how many tutor messages each account can send per day so that the
        service stays free and available to everyone; the limit is generous for
        studying and will stop an attempt to run up our costs.
      </p>

      <h2>Cost</h2>
      <p>
        The core ground school is free, permanently. Safety material will never
        be put behind a payment. If paid features are added later, they will be
        funded by schools and sponsors rather than by charging students for
        safety knowledge, and nothing you already have will be taken away to
        make room for them.
      </p>

      <h2>Stopping</h2>
      <p>
        You can stop using PilotPathway whenever you like. We may suspend an
        account that is being used to harm other students or the service. If we
        ever shut the service down, we will give you notice and a way to
        download your data first.
      </p>

      <h2>Changes</h2>
      <p>
        When these terms change, the date at the top changes. If a change
        matters to you — anything about your data or your access — we will tell
        you rather than relying on you noticing.
      </p>

      <h2>Contact</h2>
      <p>
        Questions go to{" "}
        <a
          href="mailto:demetrius@pilotpathway.ai"
          className="font-medium underline"
        >
          demetrius@pilotpathway.ai
        </a>
        . See also our{" "}
        <Link href="/privacy" className="font-medium underline">
          privacy policy
        </Link>
        .
      </p>
    </>
  );
}
