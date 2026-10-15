export const MAX_TEXT_LENGTH = 200

// Regexes are built per call rather than hoisted: module-level constants are
// static mutants that Stryker cannot attribute to tests (ignoreStatic).
export function sanitizeText(
  value: string | null | undefined,
  maxLength: number = MAX_TEXT_LENGTH
): string {
  const cleaned = (value ?? '')
    // Control characters incl. newlines, DEL/C1 and Unicode line separators.

    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    // Backticks and `${` / `$(` openers stay inert even if a consumer
    // interpolates the text into a shell.
    .replace(/`|\$(?=[{(])/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (cleaned.length <= maxLength) {
    return cleaned
  }
  return `${cleaned.slice(0, maxLength - 1)}…`
}
