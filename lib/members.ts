import { FULL_MEMBER_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import {
  RemoveMemberSchema,
  SetMemberRoleSchema,
  type RemoveMemberSchemaType,
  type SetMemberRoleSchemaType,
} from "@/schemas/membership";

export async function removeMember(
  householdId: string,
  callerId: string,
  role: MemberRole,
  input: RemoveMemberSchemaType,
) {
  assertFullMemberRole(role);

  const parsed = RemoveMemberSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId } = parsed.data;

  if (userId === callerId) {
    throw new DomainError("Use leave household to remove yourself");
  }

  const removed = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
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

  if (!removed) {
    throw new DomainError("Member not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.householdMembership.deleteMany({
      where: {
        householdId,
        userId,
      },
    });

    await tx.apiToken.updateMany({
      where: {
        householdId,
        userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    const remaining = await tx.householdMembership.count({
      where: {
        householdId,
      },
    });

    if (remaining === 0) {
      await tx.household.delete({
        where: {
          id: householdId,
        },
      });
    }
  });

  return removed.user.name;
}

export async function setMemberRole(
  householdId: string,
  callerId: string,
  role: MemberRole,
  input: SetMemberRoleSchemaType,
) {
  const parsed = SetMemberRoleSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Bad request");
  }

  const { userId, role: nextRole } = parsed.data;

  if (userId === callerId) {
    if (nextRole !== FULL_MEMBER_ROLE) {
      throw new DomainError(
        "Use leave household to give up your own edit access",
      );
    }
    const fullMemberCount = await prisma.householdMembership.count({
      where: {
        householdId,
        role: FULL_MEMBER_ROLE,
      },
    });
    if (fullMemberCount > 0) {
      throw new DomainError("Only another member can change your role");
    }
  } else {
    assertFullMemberRole(role);
  }

  const target = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
  });

  if (!target) {
    throw new DomainError("Member not found");
  }

  await prisma.householdMembership.update({
    where: {
      householdId_userId: {
        householdId,
        userId,
      },
    },
    data: {
      role: nextRole,
    },
  });

  return { userId, role: nextRole };
}
