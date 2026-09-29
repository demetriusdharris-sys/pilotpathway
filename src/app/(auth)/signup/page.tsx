import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";
import { maxDateOfBirth } from "@/lib/date-of-birth";

export const metadata = {
  title: "Create your account — PilotPathway.ai",
};

/**
 * What somebody can say they are.
 *
 * `student` is last on purpose in the code and first on the page: students are
 * who this is for, and the others exist to reach them.
 */
const KINDS = {
  student: {
    heading: "Start your ground school",
    blurb: "Free, and yours to keep. Stage 1 opens as soon as you are in.",
    cardTitle: "I want to learn to fly",
    cardBlurb:
      "Free Private Pilot ground school, an instructor you can ask anything, and practice tests.",
    askDateOfBirth: true,
  },
  pilot: {
    heading: "Volunteer in a classroom",
    blurb:
      "You spend forty-five minutes in a room. Some of those students have never met a pilot.",
    cardTitle: "I fly for a living",
    cardBlurb:
      "Visit a classroom near you, or join by video, and keep a record of the students you have reached.",
    askDateOfBirth: false,
  },
  cfi: {
    heading: "Volunteer, and keep us honest",
    blurb:
      "Visit classrooms. And if you are willing, we may ask you to check our ground school content before students see it.",
    cardTitle: "I am a flight instructor",
    cardBlurb:
      "Everything a professional pilot can do. We may also ask you to review our questions and quiz cards — that is something we switch on by hand, not a login you get automatically.",
    askDateOfBirth: false,
  },
  school: {
    heading: "Bring a pilot to your students",
    blurb:
      "Set your school up and ask for a working pilot. Every pilot who visits has had a background check.",
    cardTitle: "I teach, or I run a programme",
    cardBlurb:
      "Ask for a pilot to visit your classroom, and see what your students do with it.",
    askDateOfBirth: false,
  },
} as const;

type Kind = keyof typeof KINDS;

const ORDER: Kind[] = ["student", "cfi", "pilot", "school"];

function isKind(value: string | undefined): value is Kind {
  return value !== undefined && value in KINDS;
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; as?: string }>;
}) {
  const { next, as } = await searchParams;

  // Somebody following a link had a reason for coming — a guardian accepting an
  // invite, above all — so they go straight to the ordinary form. Those invite
  // emails are already in the world and must keep working.
  const kind: Kind | null = isKind(as) ? as : next ? "student" : null;

  if (kind === null) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Which of these is you?</h1>
          <p className="text-muted-foreground text-sm text-pretty">
            It decides what you see. Nothing here is locked in — tell us if we
            guess wrong.
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {ORDER.map((entry) => (
            <li key={entry}>
              <Link
                href={`/signup?as=${entry}`}
                className="border-border hover:border-gold-strong block rounded-lg border p-4 transition-colors"
              >
                <span className="font-medium">{KINDS[entry].cardTitle}</span>
                <span className="text-muted-foreground mt-1 block text-sm text-pretty">
                  {KINDS[entry].cardBlurb}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-foreground font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  const copy = KINDS[kind];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{copy.heading}</h1>
        <p className="text-muted-foreground text-sm text-pretty">
          {copy.blurb}
        </p>
      </div>

      <AuthForm
        action={signUp}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        passwordHint="At least 8 characters."
        askFirstName
        askDateOfBirth={copy.askDateOfBirth}
        maxDateOfBirth={copy.askDateOfBirth ? maxDateOfBirth() : undefined}
        next={next}
        signupAs={kind}
      />

      {/* Only shown when they chose, not when they arrived by invite link — in
          that case there is no choice to go back to. */}
      {isKind(as) ? (
        <p className="text-muted-foreground text-xs">
          Not you?{" "}
          <Link href="/signup" className="text-foreground underline">
            Pick again
          </Link>
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs text-pretty">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-foreground underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-foreground underline">
          privacy policy
        </Link>
        .
      </p>

      <p className="text-muted-foreground text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground font-medium underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
