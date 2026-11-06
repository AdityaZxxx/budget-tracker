"use server";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function getHouseholdMemberCount() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await prisma.householdMembership.count({
    where: {
      householdId: result.household.id,
    },
  });
}
