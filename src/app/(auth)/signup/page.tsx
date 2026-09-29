import Link from "next/link";
import { GraduationCap, Plane, School, UserCheck } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { signUp } from "../actions";
import { maxDateOfBirth } from "@/lib/date-of-birth";

export const metadata = {
  title: "Create your account — PilotPathway.ai",
};

/**
 * What somebody can say they are.
 *
 * Laid out the way the pitch demo did it, because that version reads faster and
 * the founder was right about why — though not for the reason it first looks.
 *
 * It is not the two-by-two grid: on a phone that grid is a single column, and
 * this audience is mobile-first. What makes it scan is the card itself — an
 * icon, an ALL-CAPS line saying who you are *before* the role name, a bold noun,
 * and an explicit "Continue as" rather than a sentence you have to parse. You
 * find yourself by category instead of reading four paragraphs.
 *
 * Two deliberate differences from the demo. It stays one column, because the
 * auth card is 384px and widening it would change the verified login page too.
 * And it uses one accent rather than four colours, because inventing a palette
 * is a design decision rather than a layout one — easy to add if wanted.
 */
const KINDS = {
  student: {
    eyebrow: "Future pilot",
    name: "Student",
    icon: GraduationCap,
    cardBlurb:
      "Free Private Pilot ground school, an instructor you can ask anything, and practice tests. Yours to keep.",
    heading: "Start your ground school",
    blurb: "Free, and yours to keep. Stage 1 opens as soon as you are in.",
    askDateOfBirth: true,
  },
  cfi: {
    eyebrow: "Flight instructor",
    name: "CFI",
    icon: UserCheck,
    cardBlurb:
      "Visit classrooms near you. We may also ask you to check our ground school content before students see it.",
    heading: "Volunteer, and keep us honest",
    blurb:
      "Visit classrooms. And if you are willing, we may ask you to check our ground school content before students see it.",
    askDateOfBirth: false,
  },
  pilot: {
    eyebrow: "Working aviator",
    name: "Pilot mentor",
    icon: Plane,
    cardBlurb:
      "Visit a classroom near you, or join by video, and keep a record of every student you have reached.",
    heading: "Volunteer in a classroom",
    blurb:
      "You spend forty-five minutes in a room. Some of those students have never met a pilot.",
    askDateOfBirth: false,
  },
  school: {
    eyebrow: "Educator · school · sponsor",
    name: "School",
    icon: School,
    cardBlurb:
      "Ask for a working pilot to visit your classroom, and see what your students do with it.",
    heading: "Bring a pilot to your students",
    blurb:
      "Set your school up and ask for a working pilot. Every pilot who visits has had a background check.",
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
  searchParams: Promise<{ next?: string; as?: string; visit?: string }>;
}) {
  const { next, as, visit } = await searchParams;

  // Somebody following a link had a reason for coming — a guardian accepting an
  // invite, above all — so they go straight to the ordinary form. Those invite
  // emails are already in the world and must keep working.
  const kind: Kind | null = isKind(as) ? as : next || visit ? "student" : null;

  if (kind === null) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2 text-center">
          <span className="text-gold-strong text-xs font-semibold tracking-[0.15em] uppercase">
            Get started
          </span>
          <h1 className="text-3xl font-semibold text-balance">
            Choose how you&rsquo;ll fly with us
          </h1>
          <p className="text-muted-foreground text-sm text-pretty">
            PilotPathway connects four kinds of people. Pick the one that fits —
            you can always tell us if we guessed wrong.
          </p>
        </div>

        {/* One column on purpose. The auth card is 384px wide and this
            audience is mobile-first, where the demo’s two-by-two grid is a
            single column as well — the readability comes from the card itself,
            not the grid. Widening the shared auth layout would change the
            verified login page too, which is a separate decision. */}
        <ul className="flex flex-col gap-3">
          {ORDER.map((entry) => {
            const copy = KINDS[entry];
            const Icon = copy.icon;

            return (
              <li key={entry}>
                <Link
                  href={`/signup?as=${entry}`}
                  className="border-border hover:border-gold-strong group flex h-full flex-col rounded-lg border border-t-2 p-5 transition-colors"
                >
                  <span
                    aria-hidden
                    className="bg-gold/10 text-gold-strong mb-3 flex size-10 items-center justify-center rounded-md"
                  >
                    <Icon className="size-5" />
                  </span>

                  <span className="text-muted-foreground text-[0.7rem] font-semibold tracking-[0.12em] uppercase">
                    {copy.eyebrow}
                  </span>
                  <span className="mt-0.5 text-xl font-semibold">
                    {copy.name}
                  </span>
                  <span className="text-muted-foreground mt-2 flex-1 text-sm text-pretty">
                    {copy.cardBlurb}
                  </span>

                  <span className="text-gold-strong mt-4 text-sm font-medium">
                    Continue as {copy.name.toLowerCase()}{" "}
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground text-center text-sm">
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
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.12em] uppercase">
          {copy.eyebrow}
        </span>
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
        visitCode={visit}
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
