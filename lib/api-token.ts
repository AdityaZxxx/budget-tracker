import type { TokenScope } from "@/lib/types";
import type {
  ApiToken,
  Household,
  HouseholdMembership,
  User,
} from "@prisma/client";

import { headers } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

import { READ_WRITE_SCOPE, VIEW_ONLY_ROLE } from "@/lib/constants";
import prisma from "@/lib/prisma";

// The token carries 256 bits of entropy, so hashing it is enough to make a
// leaked database useless. A slow key derivation would only slow down every
// request the token makes.
export function hashApiToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateApiToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashApiToken(token) };
}

export type TokenAuth =
  | {
      ok: true;
      household: Household;
      user: User;
      membership: HouseholdMembership;
      token: ApiToken;
    }
  | { ok: false; status: number; error: string };

export async function requireToken(scope: TokenScope): Promise<TokenAuth> {
  const authorization = (await headers()).get("authorization");
  const presented = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!presented) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const token = await prisma.apiToken.findUnique({
    where: { tokenHash: hashApiToken(presented) },
    include: { household: true, user: true },
  });

  if (!token || token.revokedAt) {
    return { ok: false, status: 401, error: "Invalid token" };
  }

  if (token.expiresAt && token.expiresAt <= new Date()) {
    return { ok: false, status: 401, error: "This token has expired" };
  }

  if (!token.household.agentAccessEnabled) {
    return {
      ok: false,
      status: 401,
      error: "Agent access is off for this household",
    };
  }

  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: token.householdId,
        userId: token.userId,
      },
    },
  });

  if (!membership) {
    return {
      ok: false,
      status: 401,
      error: "The token owner is no longer a member of this household",
    };
  }

  if (scope === READ_WRITE_SCOPE && token.scope !== READ_WRITE_SCOPE) {
    return { ok: false, status: 403, error: "This token is read-only" };
  }

  if (scope === READ_WRITE_SCOPE && membership.role === VIEW_ONLY_ROLE) {
    return {
      ok: false,
      status: 403,
      error: "View-only members cannot use a read-write token",
    };
  }

  return {
    ok: true,
    household: token.household,
    user: token.user,
    membership,
    token,
  };
}
