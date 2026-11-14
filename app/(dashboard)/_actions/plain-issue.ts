const SCHEMA_DEFAULT =
  /^(invalid input|invalid option|invalid string|invalid number|invalid date|invalid boolean|invalid enum|too small|too big|expected|bad request)/i;

export function writtenIssue(
  message: string | undefined,
  fallback: string,
): string {
  return message && !SCHEMA_DEFAULT.test(message.trim()) ? message : fallback;
}
