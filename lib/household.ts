import { cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import {
  ACTIVE_HOUSEHOLD_COOKIE,
  FULL_MEMBER_ROLE,
  VIEW_ONLY_ROLE,
} from "@/lib/constants";
import prisma from "@/lib/prisma";

export { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE };

// A user can belong to several Households; the cookie picks the active one.
// A cookie pointing at a Household the user is no longer a member of falls
// back to the oldest membership, so stale values can never surface another
// household's ledger. A user with no memberships lazily gets a fresh
// personal Household.
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
