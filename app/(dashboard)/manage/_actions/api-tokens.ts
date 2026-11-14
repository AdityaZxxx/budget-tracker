"use server";

import type {
  CreateApiTokenSchemaType,
  RevokeApiTokenSchemaType,
  SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";
import type { Prisma } from "@prisma/client";

import { redirect } from "next/navigation";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import {
  generateApiToken,
  setAgentAccess as setAgentAccessSeam,
} from "@/lib/api-token";
import { FULL_MEMBER_ROLE, READ_WRITE_SCOPE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateApiTokenSchema,
  RevokeApiTokenSchema,
  SetAgentAccessSchema,
} from "@/schemas/api-tokens";

import { firstIssueMessage } from "./parse-error";

export async function createApiToken(
  form: CreateApiTokenSchemaType,
): Promise<ActionResult<{ id: string; token: string }>> {
  const parsedBody = CreateApiTokenSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      firstIssueMessage(
        parsedBody.error,
        "Unable to create the token. Check the details and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household, membership } = result;

  if (!household.agentAccessEnabled) {
    return fail(
      "Agent access is off for this household. Turn it on and try again.",
    );
  }

  // A view-only Member can hold a read-only token, but never one that writes.
  if (
    parsedBody.data.scope === READ_WRITE_SCOPE &&
    membership.role !== FULL_MEMBER_ROLE
  ) {
    return fail(
      "View-only members cannot create a read-write token. Choose read only instead.",
    );
  }

  const { token, tokenHash } = generateApiToken();

  const created = await prisma.apiToken.create({
    data: {
      householdId: household.id,
      userId: session.user.id,
      name: parsedBody.data.name,
      scope: parsedBody.data.scope,
      tokenHash,
      expiresAt: parsedBody.data.expiresAt ?? null,
    },
  });

  // Only the hash is stored, so this is the one time the plaintext exists.
  return ok({ id: created.id, token });
}

const apiTokenSelect = {
  id: true,
  name: true,
  scope: true,
  createdAt: true,
  expiresAt: true,
  user: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export type ApiTokenSummary = Prisma.ApiTokenGetPayload<{
  select: typeof apiTokenSelect;
}>;

export async function listApiTokens(): Promise<
  ActionResult<ApiTokenSummary[]>
> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return ok(
    await prisma.apiToken.findMany({
      where: {
        householdId: result.household.id,
        revokedAt: null,
      },
      select: apiTokenSelect,
      orderBy: {
        createdAt: "desc",
      },
    }),
  );
}

export async function revokeApiToken(
  form: RevokeApiTokenSchemaType,
): Promise<ActionResult> {
  const parsedBody = RevokeApiTokenSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      firstIssueMessage(
        parsedBody.error,
        "Unable to revoke the token. Try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household, membership } = result;

  const token = await prisma.apiToken.findFirst({
    where: {
      id: parsedBody.data.id,
      householdId: household.id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!token) {
    return fail(
      "Token not found. It may have been revoked. Refresh and try again.",
    );
  }

  // A view-only Member can only revoke their own tokens.
  if (
    membership.role !== FULL_MEMBER_ROLE &&
    token.userId !== session.user.id
  ) {
    return fail(
      "View-only members can only revoke their own tokens. Ask a full member to revoke it.",
    );
  }

  await prisma.apiToken.updateMany({
    where: {
      id: token.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  return ok();
}

export async function setAgentAccess(
  form: SetAgentAccessSchemaType,
): Promise<ActionResult> {
  const parsedBody = SetAgentAccessSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      firstIssueMessage(
        parsedBody.error,
        "Unable to change agent access. Try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    await setAgentAccessSeam(
      result.household.id,
      parsedBody.data.enabled,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }

  return ok();
}
