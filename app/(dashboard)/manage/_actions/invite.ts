"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
} from "@/lib/invites";
import prisma from "@/lib/prisma";
import { RevokeInviteLinkSchema } from "@/schemas/invite";

export async function createInviteLink() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  return await createInviteLinkSeam(
    household.id,
    session.user.id,
    result.membership.role,
  );
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

  await revokeInviteLinkSeam(
    result.household.id,
    parsedBody.data.id,
    result.membership.role,
  );
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
