import { cache } from "react";

import { getSession } from "@/lib/auth";
import { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE } from "@/lib/constants";
import prisma from "@/lib/prisma";

export { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE };

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
    return { household: membership.household, membership };
  }

  return await prisma.$transaction(async (tx) => {
    const household = await tx.household.create({
      data: {},
    });
    const createdMembership = await tx.householdMembership.create({
      data: {
        householdId: household.id,
        userId,
      },
    });
    return { household, membership: createdMembership };
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

  const { household, membership } = await getOrCreatePersonalHousehold(
    session.user.id,
  );
  return { session, household, membership };
});

// View-only Members can read the whole ledger but change nothing; full
// Members keep the equal rights every Member starts with. There is still no
// owner: no Member outranks another full Member.
export function assertFullMember(
  result: NonNullable<Awaited<ReturnType<typeof requireHousehold>>>,
) {
  if (result.membership.role === VIEW_ONLY_ROLE) {
    throw new Error("View-only members cannot make changes in this household");
  }
}
