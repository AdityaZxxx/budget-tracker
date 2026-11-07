import { cache } from "react";

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function getOrCreatePersonalHousehold(userId: string) {
  const membership = await prisma.householdMembership.findFirst({
    where: {
      userId,
    },
    include: {
      household: true,
    },
  });

  if (membership) {
    return membership.household;
  }

  return await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: {},
    });
    await tx.householdMembership.create({
      data: {
        householdId: household.id,
        userId,
      },
    });
    return household;
  });
}

// The dashboard page and the member count action both need the caller's
// household. React caches this per render, so the household is resolved once
// instead of twice.
export const requireHousehold = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const household = await getOrCreatePersonalHousehold(session.user.id);
  return { session, household };
});
