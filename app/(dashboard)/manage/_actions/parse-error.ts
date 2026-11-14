// Zod's default messages are machine-shaped, so only messages written for
// people pass through; everything else becomes the action's own sentence.
const MACHINE_MESSAGE =
  /Invalid input|Invalid option|Too small|Too big|Invalid type|Expected/i;

export function firstIssueMessage(
  error: { issues: readonly { message: string }[] },
  fallback: string,
) {
  const message = error.issues[0]?.message;
  return message && !MACHINE_MESSAGE.test(message) ? message : fallback;
}
