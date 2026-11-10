import type { TokenAuth } from "@/lib/api-token";
import type { TokenScope } from "@/lib/types";

// The token is the only credential, so no tool depends on a browser session.
export type McpContext = {
  householdId: string;
  householdName: string | null;
  currency: string | null;
  userId: string;
  userName: string;
  role: string;
  scope: TokenScope;
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
    scope: auth.token.scope as TokenScope,
  };
}
