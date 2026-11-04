"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  RemoveMemberSchema,
  RemoveMemberSchemaType,
} from "@/schemas/membership";
import { redirect } from "next/navigation";

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

  if (parsedBody.data.userId === session.user.id) {
    throw new Error("Use leave household to remove yourself");
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.deleteMany({
      where: {
        householdId: household.id,
        userId: parsedBody.data.userId,
      },
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
}
