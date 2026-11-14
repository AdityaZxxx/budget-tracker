"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import {
  renameHousehold as renameHouseholdSeam,
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

  const household = await renameHouseholdSeam(
    result.household.id,
    name,
    result.membership.role,
  );

  revalidatePath("/", "layout");
  return household;
}

export async function createHousehold(name: string) {
  const parsedName = HouseholdNameSchema.safeParse(name);
  if (!parsedName.success) {
    throw new Error(parsedName.error.issues[0]?.message ?? "Invalid name");
  }

  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const household = await prisma.$transaction(async (tx) => {
    const created = await tx.household.create({
      data: {
        name: parsedName.data || null,
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
