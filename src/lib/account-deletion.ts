/**
 * The word a student types to confirm deleting their account.
 *
 * Lives outside the Server Action module because a "use server" file may only
 * export async functions, and both the form and the action need it — one
 * copy, so the button the student sees and the check the server makes cannot
 * disagree.
 */
export const DELETE_CONFIRMATION_WORD = "DELETE";

/**
 * Case-insensitive on purpose: phone keyboards capitalise the first letter,
 * and "Delete" typed deliberately is exactly as deliberate as "DELETE".
 */
export function isDeleteConfirmed(value: string): boolean {
  return value.trim().toUpperCase() === DELETE_CONFIRMATION_WORD;
}
