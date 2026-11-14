// A rejection the domain itself produces: a rule the input broke, or a thing
// that is not there. Transports present its message as the rejection; any
// other failure is a bug and each transport answers it with generic copy.
export class DomainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DomainError";
  }
}

// Session-guarded routes answer a missing session with this instead of
// redirecting to the sign-in page, which is HTML a fetcher cannot parse.
export function unauthorized() {
  return Response.json({ message: "Unauthorized" }, { status: 401 });
}
