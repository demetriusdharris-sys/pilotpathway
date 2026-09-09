/**
 * The 13+ age gate, in one place.
 *
 * Both halves live here because they encode the same rule from opposite
 * directions: maxDateOfBirth decides what the browser will let a student pick,
 * dateOfBirthError decides what the server will accept. Two copies of an age
 * gate is how one of them drifts, and the half that drifts is the half nobody
 * notices until a 12-year-old has an account.
 *
 * Nothing here may be called from a client component. Both functions read the
 * current date, and a date derived during render differs between the server
 * pass and the client pass across a midnight boundary — a hydration mismatch.
 * Compute on the server, pass the result down as a prop.
 */

export const MINIMUM_AGE_YEARS = 13;

const DATE_OF_BIRTH_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const IMPLAUSIBLE_DATE_OF_BIRTH =
  "That date doesn't look right. Use the date picker.";

/**
 * Returns a student-facing error, or undefined when the date of birth clears
 * the 13+ gate.
 *
 * Every comparison here is on the year / month / day integers. Handing the
 * string to `new Date()` would parse it as UTC midnight, which is the previous
 * calendar day everywhere west of Greenwich — California included — so a
 * student who is exactly 13 today would be told they are 12.
 */
export function dateOfBirthError(value: string): string | undefined {
  if (!value) {
    return "Enter your date of birth.";
  }
  if (!DATE_OF_BIRTH_PATTERN.test(value)) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  const [year, month, day] = value.split("-").map(Number);

  // Local-time construction, and a round-trip through it rejects dates that
  // match the pattern but do not exist, such as 2010-02-30 or month 13.
  const asDate = new Date(year, month - 1, day);
  if (
    asDate.getFullYear() !== year ||
    asDate.getMonth() !== month - 1 ||
    asDate.getDate() !== day
  ) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  if (year < 1900) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  const isFuture =
    year > todayYear ||
    (year === todayYear &&
      (month > todayMonth || (month === todayMonth && day > todayDay)));
  if (isFuture) {
    return IMPLAUSIBLE_DATE_OF_BIRTH;
  }

  // Has the 13th birthday already arrived, on the same calendar?
  const thirteenthYear = year + MINIMUM_AGE_YEARS;
  const hasTurnedThirteen =
    thirteenthYear < todayYear ||
    (thirteenthYear === todayYear &&
      (month < todayMonth || (month === todayMonth && day <= todayDay)));
  if (!hasTurnedThirteen) {
    return "You need to be at least 13 to sign up. Come back when you are — aviation will still be here.";
  }

  return undefined;
}

/**
 * Latest date of birth that clears the 13+ gate, as `YYYY-MM-DD`, for the
 * `max` attribute on a date input.
 *
 * Built from local calendar parts rather than by subtracting milliseconds, so
 * no UTC round-trip can shift the day backward.
 */
export function maxDateOfBirth(): string {
  const today = new Date();
  const year = today.getFullYear() - MINIMUM_AGE_YEARS;
  const month = today.getMonth();
  // Feb 29 has no counterpart 13 years back. Clamping down to the last real
  // day of the month keeps the gate on the safe side, rather than emitting a
  // date that does not exist and that the browser would ignore.
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(today.getDate(), lastDayOfMonth);

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
