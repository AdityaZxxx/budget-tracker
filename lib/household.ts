import { cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import {
  ACTIVE_HOUSEHOLD_COOKIE,
  FULL_MEMBER_ROLE,
  VIEW_ONLY_ROLE,
} from "@/lib/constants";
import prisma from "@/lib/prisma";
import { assertCanWrite } from "@/lib/roles";

export { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE };

export async function getOrCreatePersonalHousehold(userId: string) {
  const memberships = await prisma.householdMembership.findMany({
    where: {
      userId,
    },
    include: {
      household: true,
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  const oldest = memberships[0];
  if (!oldest) {
    return await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({
        data: {},
      });
      return await tx.householdMembership.create({
        data: {
          householdId: household.id,
          userId,
        },
        include: {
          household: true,
        },
      });
    });
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;
  if (activeId) {
    const active = memberships.find(
      (membership) => membership.householdId === activeId,
    );
    if (active) {
      return active;
    }
  }

  return oldest;
}

// The dashboard page and the member count action both need the caller's
// household. React caches this per render, so the household is resolved once
// instead of twice.
export const requireHousehold = cache(async () => {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const membership = await getOrCreatePersonalHousehold(session.user.id);
  return { session, household: membership.household, membership };
});

// Only call from a Server Action or Route Handler: cookies cannot be written
// while a page renders.
export async function setActiveHouseholdCookie(householdId: string) {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_HOUSEHOLD_COOKIE, householdId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearActiveHouseholdCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_HOUSEHOLD_COOKIE);
}

export function assertFullMember(
  result: NonNullable<Awaited<ReturnType<typeof requireHousehold>>>,
) {
  assertCanWrite(result.membership.role);
}
