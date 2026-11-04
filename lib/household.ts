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

export async function requireHousehold() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const household = await getOrCreatePersonalHousehold(session.user.id);
  return { session, household };
}
