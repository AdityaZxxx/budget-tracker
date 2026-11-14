import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";

export async function createInviteLink(
  householdId: string,
  userId: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  return await prisma.inviteLink.create({
    data: {
      token: crypto.randomUUID(),
      householdId,
      createdById: userId,
    },
  });
}

export async function revokeInviteLink(
  householdId: string,
  inviteLinkId: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const result = await prisma.inviteLink.updateMany({
    where: {
      id: inviteLinkId,
      householdId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
  if (result.count === 0) {
    throw new DomainError("Invite link not found");
  }
}
