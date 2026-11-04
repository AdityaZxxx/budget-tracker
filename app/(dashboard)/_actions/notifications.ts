"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function listNotifications() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  return await prisma.notification.findMany({
    where: {
      householdId: household.id,
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
}

export type NotificationItem = Awaited<
  ReturnType<typeof listNotifications>
>[number];

export async function markAllRead() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  await prisma.notification.updateMany({
    where: {
      householdId: household.id,
      userId: session.user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}
