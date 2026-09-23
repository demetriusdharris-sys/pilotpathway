import Link from "next/link";

export const metadata = {
  title: "Privacy — PilotPathway.ai",
};

/**
 * Written to describe what the code actually does, not what a template says a
 * privacy policy usually says. Anything listed here can be pointed at a table
 * or a route. Where a question is genuinely unsettled, it says so.
 *
 * **This has not been reviewed by a lawyer.** Two decisions are still open and
 * are marked in the text; both are recorded in CLAUDE.md. Equity Engine, as the
 * fiscal sponsor whose name is on this, should review it before a real beta.
 */
export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Privacy</h1>
      <p className="text-muted-foreground">
        Last updated 23 September 2026. PilotPathway.ai is a project of Equity
        Engine, a 501(c)(3) nonprofit, which is the organisation accountable for
        the information described here.
      </p>

      <p>
        This is written to be read, not to be survived. If anything here is
        unclear, ask us at{" "}
        <a
          href="mailto:demetrius@pilotpathway.ai"
          className="font-medium underline"
        >
          demetrius@pilotpathway.ai
        </a>{" "}
        and we will answer in plain words.
      </p>

      <h2>What we hold about you</h2>
      <ul>
        <li>
          <strong>Your account:</strong> email address, first name if you give
          one, and date of birth. Date of birth is required because some parts
          of this app work differently for people under 18, and we cannot
          protect a minor we cannot identify as one.
        </li>
        <li>
          <strong>Your learning:</strong> which lessons you have opened and
          marked complete, and your answers to quiz questions — including
          whether each answer was right.
        </li>
        <li>
          <strong>Your conversations with Captain Path</strong>, the AI ground
          instructor, so the tutor remembers what you have discussed and you do
          not start from nothing each time.
        </li>
        <li>
          <strong>Guardian links</strong>, if a parent or guardian is connected
          to your account, and a record of anything they do on your behalf.
        </li>
        <li>
          <strong>Usage records</strong> — how many tutor messages you have sent
          and what they cost us to answer. This is how we keep the app free and
          within budget.
        </li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We do not sell your information. Not to anyone, for any price.</li>
        <li>
          We do not show advertising, so nothing is profiled to target you.
        </li>
        <li>
          We do not share your conversations with the tutor with your school,
          your sponsor, or anyone else. Those are yours.
        </li>
      </ul>

      <h2>Who else sees it</h2>
      <p>
        We use a small number of companies to run the service. They process
        information on our behalf and are not permitted to use it for their own
        purposes:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — stores your account and everything above.
        </li>
        <li>
          <strong>Vercel</strong> — runs the website and keeps short-lived
          technical logs.
        </li>
        <li>
          <strong>Anthropic</strong> — provides the AI model. Your messages to
          the tutor, and the lesson you are on, are sent there to generate each
          reply.
        </li>
        <li>
          <strong>Resend</strong> — sends our emails, so it holds the addresses
          we send to.
        </li>
      </ul>

      <h2>Your school, and only if you say so</h2>
      <p>
        If you are enrolled at a school or programme that uses PilotPathway,
        their staff can see your lesson progress and quiz results{" "}
        <strong>only if you choose to share them</strong>, and only with the
        organisation you chose. You can stop at any time on your profile, and it
        takes effect immediately. If you are under 18, a verified parent or
        guardian can also make that choice for you — and you can still stop it
        yourself.
      </p>
      <p>
        Your conversations with the tutor are never included in what a school
        can see.
      </p>

      <h2>If you are under 18</h2>
      <p>
        You must be at least 13 to have an account. Some things — like live
        sessions with an instructor, when we build them — will need a parent or
        guardian to agree first. A verified guardian can also see that your
        account exists, share your progress with your school, download your
        data, and delete your account. We record who did what and when.
      </p>

      <h2>What you can do about it</h2>
      <ul>
        <li>
          <strong>Download everything we hold about you</strong>, from your
          profile page, as a file you can keep.
        </li>
        <li>
          <strong>Delete your account</strong>, from your profile page. This
          removes your account, your progress, your quiz answers, and your
          conversations with the tutor.
        </li>
        <li>
          <strong>Stop sharing with a school</strong> at any time, without
          losing any of your own progress.
        </li>
      </ul>

      <h2>What deleting does not reach</h2>
      <p>
        Deleting your account removes your records from our database, but some
        copies live outside it for a while and are not ours to reach into:
        short-lived technical logs at Vercel, our email provider&apos;s record
        that a message was sent, our sign-in provider&apos;s logs, and the
        conversations that were sent to Anthropic to generate replies. A record
        that a guardian deleted a student&apos;s account is also kept, because a
        third party acting on a minor&apos;s data should leave a trace that
        outlives the account.
      </p>

      <h2>Two things we are still deciding</h2>
      <p>
        We would rather tell you what is unsettled than write something
        reassuring and vague:
      </p>
      <ul>
        <li>
          <strong>
            Whether a record that consent was given should survive deleting an
            account.
          </strong>{" "}
          Today it does not — deleting your account erases it. A school may
          later need proof that permission existed, and we are taking advice on
          how to hold both.
        </li>
        <li>
          <strong>
            Whether the record of a guardian&apos;s action should name the
            student.
          </strong>{" "}
          Today it does not: it keeps the guardian&apos;s email and the
          student&apos;s account number, deliberately not the deleted
          student&apos;s details.
        </li>
      </ul>
      <p>
        When either is settled, this page changes and the date at the top
        changes with it.
      </p>

      <h2>Security</h2>
      <p>
        Access to your records is enforced by the database itself, not only by
        the app — so a mistake in our code is not enough to expose one
        student&apos;s data to another. Guardian invite links are stored hashed,
        expire, and work once.
      </p>

      <h2>Asking us something</h2>
      <p>
        Write to{" "}
        <a
          href="mailto:demetrius@pilotpathway.ai"
          className="font-medium underline"
        >
          demetrius@pilotpathway.ai
        </a>
        . If you are a parent, guardian, or school with a question about a
        student&apos;s data, say so and we will treat it as urgent. See also our{" "}
        <Link href="/terms" className="font-medium underline">
          terms
        </Link>
        .
      </p>
    </>
  );
}
