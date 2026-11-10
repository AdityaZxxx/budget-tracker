"use server";

import type {
  CreateApiTokenSchemaType,
  RevokeApiTokenSchemaType,
  SetAgentAccessSchemaType,
} from "@/schemas/api-tokens";

import { redirect } from "next/navigation";

import { generateApiToken } from "@/lib/api-token";
import { FULL_MEMBER_ROLE, READ_WRITE_SCOPE } from "@/lib/constants";
import { assertFullMember, requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateApiTokenSchema,
  RevokeApiTokenSchema,
  SetAgentAccessSchema,
} from "@/schemas/api-tokens";

export async function createApiToken(form: CreateApiTokenSchemaType) {
  const parsedBody = CreateApiTokenSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household, membership } = result;

  if (!household.agentAccessEnabled) {
    throw new Error("Agent access is off for this household");
  }

  // A view-only Member can hold a read-only token, but never one that writes.
  if (
    parsedBody.data.scope === READ_WRITE_SCOPE &&
    membership.role !== FULL_MEMBER_ROLE
  ) {
    throw new Error("View-only members cannot create a read-write token");
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
  return { id: created.id, token };
}

export async function listApiTokens() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await prisma.apiToken.findMany({
    where: {
      householdId: result.household.id,
      revokedAt: null,
    },
    select: {
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export type ApiTokenSummary = Awaited<ReturnType<typeof listApiTokens>>[number];

export async function revokeApiToken(form: RevokeApiTokenSchemaType) {
  const parsedBody = RevokeApiTokenSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
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
    throw new Error("Token not found");
  }

  // A view-only Member can only revoke their own tokens.
  if (
    membership.role !== FULL_MEMBER_ROLE &&
    token.userId !== session.user.id
  ) {
    throw new Error("View-only members can only revoke their own tokens");
  }

  await prisma.apiToken.updateMany({
    where: {
      id: token.id,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function setAgentAccess(form: SetAgentAccessSchemaType) {
  const parsedBody = SetAgentAccessSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  const { household } = result;

  await prisma.$transaction(async (tx) => {
    await tx.household.update({
      where: { id: household.id },
      data: { agentAccessEnabled: parsedBody.data.enabled },
    });

    // Turning agent access off revokes every token in the household, so the
    // setting is a kill switch rather than a promise.
    if (!parsedBody.data.enabled) {
      await tx.apiToken.updateMany({
        where: {
          householdId: household.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }
  });
}
