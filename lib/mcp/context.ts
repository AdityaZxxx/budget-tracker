import type { TokenAuth } from "@/lib/api-token";

// Everything a tool needs to answer a request, resolved once per call. The
// token is the only credential, so no tool reads a browser session.
export type McpContext = {
  householdId: string;
  householdName: string | null;
  currency: string | null;
  userId: string;
  userName: string;
  role: string;
};

export function contextFromToken(
  auth: Extract<TokenAuth, { ok: true }>,
): McpContext {
  return {
    householdId: auth.household.id,
    householdName: auth.household.name,
    currency: auth.household.currency,
    userId: auth.user.id,
    userName: auth.user.name,
    role: auth.membership.role,
  };
}
