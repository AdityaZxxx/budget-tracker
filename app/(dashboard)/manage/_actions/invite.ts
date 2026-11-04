"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  RevokeInviteLinkSchema,
  RevokeInviteLinkSchemaType,
} from "@/schemas/invite";
import { redirect } from "next/navigation";

export async function createInviteLink() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  return await prisma.inviteLink.create({
    data: {
      token: crypto.randomUUID(),
      householdId: household.id,
      createdById: session.user.id,
    },
  });
}

export async function revokeInviteLink(form: RevokeInviteLinkSchemaType) {
  const parsedBody = RevokeInviteLinkSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  await prisma.inviteLink.updateMany({
    where: {
      id: parsedBody.data.id,
      householdId: household.id,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function listInviteLinks() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  return await prisma.inviteLink.findMany({
    where: {
      householdId: household.id,
      revokedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
