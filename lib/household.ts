import { cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth";
import { ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import {
  assertFullMemberRole,
  parseMemberRole,
  type MemberRole,
} from "@/lib/roles";
import { HouseholdNameSchema } from "@/schemas/household";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";

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
  return {
    session,
    household: membership.household,
    membership: { ...membership, role: parseMemberRole(membership.role) },
  };
});

export async function renameHousehold(
  householdId: string,
  name: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = HouseholdNameSchema.safeParse(name);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the household name",
    );
  }
  // An empty name clears it, the same shape the UI uses for a fresh space.
  return await prisma.household.update({
    where: { id: householdId },
    data: { name: parsed.data || null },
  });
}

export async function updateHouseholdCurrency(
  householdId: string,
  currency: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = UpdateUserCurrencySchema.safeParse({ currency });
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Check the currency",
    );
  }
  return await prisma.household.update({
    where: { id: householdId },
    data: { currency: parsed.data.currency },
  });
}

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
