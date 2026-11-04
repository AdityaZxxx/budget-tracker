import prisma from "@/lib/prisma";

export async function notify(
  householdId: string,
  userId: string,
  type: string,
  message: string
) {
  await prisma.notification.create({
    data: {
      householdId,
      userId,
      type,
      message,
    },
  });
}

export async function notifyMembers(
  householdId: string,
  userIds: string[],
  type: string,
  message: string
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      householdId,
      userId,
      type,
      message,
    })),
  });
}

export async function notifyHouseholdExcept(
  householdId: string,
  exceptUserId: string,
  type: string,
  message: string
) {
  const memberships = await prisma.householdMembership.findMany({
    where: {
      householdId,
      userId: {
        not: exceptUserId,
      },
    },
    select: {
      userId: true,
    },
  });
  await notifyMembers(
    householdId,
    memberships.map((membership) => membership.userId),
    type,
    message
  );
}
