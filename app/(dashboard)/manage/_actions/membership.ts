"use server";

import { redirect } from "next/navigation";

import {
  assertFullMember,
  clearActiveHouseholdCookie,
  FULL_MEMBER_ROLE,
  requireHousehold,
  setActiveHouseholdCookie,
  VIEW_ONLY_ROLE,
} from "@/lib/household";
import { notify, notifyHouseholdExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  RemoveMemberSchema,
  RemoveMemberSchemaType,
  SetEmailDigestSchema,
  SetEmailDigestSchemaType,
  SetMemberRoleSchema,
  SetMemberRoleSchemaType,
} from "@/schemas/membership";

export async function listMembers() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  return await prisma.householdMembership.findMany({
    where: {
      householdId: household.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });
}

export async function leaveHousehold() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.delete({
      where: {
        householdId_userId: {
          householdId: household.id,
          userId: session.user.id,
        },
      },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId: household.id,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: household.id,
        },
      });
    }
  });

  // Point the active-household cookie at a household the caller still
  // belongs to, or clear it. A stale value would fall back on the next read,
  // but this keeps the next screen's household a deliberate choice.
  const remainingMemberships = await prisma.householdMembership.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      joinedAt: "asc",
    },
    select: {
      householdId: true,
    },
  });
  if (remainingMemberships[0]) {
    await setActiveHouseholdCookie(remainingMemberships[0].householdId);
  } else {
    await clearActiveHouseholdCookie();
  }

  // If the household was deleted above there is nobody left to notify.
  await notifyHouseholdExcept(
    household.id,
    session.user.id,
    "member_left",
    `${session.user.name} left the household.`,
  );

  // The session stays valid; the next requireHousehold() lazily creates a
  // fresh personal household, so solo use keeps working after leaving.
  redirect("/");
}

export async function removeMember(form: RemoveMemberSchemaType) {
  const parsedBody = RemoveMemberSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  const { session, household } = result;

  if (parsedBody.data.userId === session.user.id) {
    throw new Error("Use leave household to remove yourself");
  }

  const removedMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId: parsedBody.data.userId,
      },
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!removedMembership) {
    throw new Error("Member not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.deleteMany({
      where: {
        householdId: household.id,
        userId: parsedBody.data.userId,
      },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId: household.id,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: household.id,
        },
      });
    }
  });

  // The removed member now belongs to a different household, so their bell
  // would never show this; only the remaining members are notified.
  await notifyHouseholdExcept(
    household.id,
    session.user.id,
    "member_left",
    `${removedMembership.user.name} was removed from the household.`,
  );
}

// Full Members can set other Members' roles; a Member can only change their
// own role to promote themselves back to full edit, and only when no full
// Member is left — otherwise a household whose full members all left would
// be stuck with a ledger nobody can edit.
export async function setMemberRole(form: SetMemberRoleSchemaType) {
  const parsedBody = SetMemberRoleSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household, membership } = result;
  const { userId, role } = parsedBody.data;
  const isSelf = userId === session.user.id;

  if (isSelf) {
    if (role !== FULL_MEMBER_ROLE) {
      throw new Error("Use leave household to give up your own edit access");
    }
    const fullMemberCount = await prisma.householdMembership.count({
      where: {
        householdId: household.id,
        role: FULL_MEMBER_ROLE,
      },
    });
    if (fullMemberCount > 0) {
      throw new Error("Only another member can change your role");
    }
  } else if (membership.role !== FULL_MEMBER_ROLE) {
    throw new Error("View-only members cannot change roles");
  }

  const targetMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId,
      },
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!targetMembership) {
    throw new Error("Member not found");
  }

  await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId,
      },
    },
    data: {
      role,
    },
  });

  await notify(
    household.id,
    userId,
    "member_role",
    role === VIEW_ONLY_ROLE
      ? `${session.user.name} set your access to view-only in this household.`
      : `${session.user.name} gave you full edit access in this household.`,
  );
}

export async function setEmailDigest(form: SetEmailDigestSchemaType) {
  const parsedBody = SetEmailDigestSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  // Members can only toggle their own digest preference.
  return await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId: household.id,
        userId: session.user.id,
      },
    },
    data: {
      emailDigest: parsedBody.data.emailDigest,
    },
  });
}
