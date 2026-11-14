// A rejection the domain itself produces: a rule the input broke, or a thing
// that is not there. Transports present its message as the rejection; any
// other failure is a bug and each transport answers it with generic copy.
export class DomainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DomainError";
  }
}
