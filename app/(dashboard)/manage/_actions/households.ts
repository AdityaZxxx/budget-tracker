"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { setActiveHouseholdCookie } from "@/lib/household";
import prisma from "@/lib/prisma";

// Switching is membership-gated, not role-gated: a view-only member may
// still switch to (or create) another household where they have full edit.
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

  // The creator starts working in the new household right away; the
  // dashboard sends them to the wizard because it has no currency yet.
  await setActiveHouseholdCookie(household.id);
  revalidatePath("/", "layout");
  return household;
}
