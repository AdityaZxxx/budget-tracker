"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  assertFullMember,
  requireHousehold,
  setActiveHouseholdCookie,
} from "@/lib/household";
import prisma from "@/lib/prisma";

export async function switchHousehold(householdId: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of that household");
  }

  await setActiveHouseholdCookie(householdId);
  revalidatePath("/", "layout");
}

export async function renameHousehold(name: string) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  // Empty clears the name, like createHousehold; the UI renders the default.
  const household = await prisma.household.update({
    where: {
      id: result.household.id,
    },
    data: {
      name: name.trim() || null,
    },
  });

  revalidatePath("/", "layout");
  return household;
}

export async function createHousehold(name: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const household = await prisma.$transaction(async (tx) => {
    const created = await tx.household.create({
      data: {
        name: name.trim() || null,
      },
    });
    await tx.householdMembership.create({
      data: {
        householdId: created.id,
        userId: session.user.id,
      },
    });
    return created;
  });

  await setActiveHouseholdCookie(household.id);
  revalidatePath("/", "layout");
  return household;
}
