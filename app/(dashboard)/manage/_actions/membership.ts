"use server";

import type {
  RemoveMemberSchemaType,
  SetEmailDigestSchemaType,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";

import { redirect } from "next/navigation";

import { VIEW_ONLY_ROLE } from "@/lib/constants";
import {
  clearActiveHouseholdCookie,
  requireHousehold,
  setActiveHouseholdCookie,
} from "@/lib/household";
import {
  removeMember as removeMemberSeam,
  setMemberRole as setMemberRoleSeam,
} from "@/lib/members";
import { notify, notifyHouseholdExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  RemoveMemberSchema,
  SetEmailDigestSchema,
  SetMemberRoleSchema,
} from "@/schemas/membership";

export async function listMembers() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  return await prisma.householdMembership.findMany({
    where: {
      householdId: household.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });
}

export async function leaveHousehold() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.delete({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: session.user.id,
        },
      },
    });

    // The token outlives the membership that backs it, so it is revoked here
    // rather than left working for a User who is no longer a Member.
    await tx.apiToken.updateMany({
      where: {
        householdId: household.id,
        userId: session.user.id,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId: household.id,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: household.id,
        },
      });
    }
  });

  const remainingMemberships = await prisma.householdMembership.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      householdId: true,
    },
  });
  if (remainingMemberships[0]) {
    await setActiveHouseholdCookie(remainingMemberships[0].householdId);
  } else {
    await clearActiveHouseholdCookie();
  }

  // If the household was deleted above there is nobody left to notify.
  await notifyHouseholdExcept(
    household.id,
    session.user.id,
    "member_left",
    `${session.user.name} left the household.`,
  );

  // The session stays valid; the next requireHousehold() lazily creates a
  // fresh personal household, so solo use keeps working after leaving.
  redirect("/");
}

export async function removeMember(form: RemoveMemberSchemaType) {
  const parsedBody = RemoveMemberSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  const removedName = await removeMemberSeam(
    household.id,
    session.user.id,
    result.membership.role,
    parsedBody.data,
  );

  // The removed member now belongs to a different household, so their bell
  // would never show this; only the remaining members are notified.
  await notifyHouseholdExcept(
    household.id,
    session.user.id,
    "member_left",
    `${removedName} was removed from the household.`,
  );
}

export async function setMemberRole(form: SetMemberRoleSchemaType) {
  const parsedBody = SetMemberRoleSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;
  const { userId } = parsedBody.data;

  const { role: nextRole } = await setMemberRoleSeam(
    household.id,
    session.user.id,
    result.membership.role,
    parsedBody.data,
  );

  await notify(
    household.id,
    userId,
    "member_role",
    nextRole === VIEW_ONLY_ROLE
      ? `${session.user.name} set your access to view-only in this household.`
      : `${session.user.name} gave you full edit access in this household.`,
  );
}

export async function setEmailDigest(form: SetEmailDigestSchemaType) {
  const parsedBody = SetEmailDigestSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  // Members can only toggle their own digest preference.
  return await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId: session.user.id,
      },
    },
    data: {
      emailDigest: parsedBody.data.emailDigest,
    },
  });
}
