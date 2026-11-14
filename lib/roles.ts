import { VIEW_ONLY_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

// The transports authenticate; the seam authorizes. Every write in lib/
// asserts the caller's role before it touches the row, so no transport can
// forget the check.
export function assertCanWrite(role: string) {
  if (role === VIEW_ONLY_ROLE) {
    throw new DomainError(
      "View-only members cannot make changes in this household",
    );
  }
}
