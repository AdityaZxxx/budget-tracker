import { z } from "zod";

import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";

// seam-parse-exempt: inputs are session values, never user input.
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

const InviteIdSchema = z.object({
  id: z.string().min(1),
});

export async function revokeInviteLink(
  householdId: string,
  inviteLinkId: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);

  const parsedId = InviteIdSchema.safeParse({ id: inviteLinkId });
  if (!parsedId.success) {
    throw new DomainError(
      parsedId.error.issues[0]?.message ?? "Invite link not found",
    );
  }
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
