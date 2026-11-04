"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

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
