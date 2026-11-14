"use server";

import type { Notification } from "@prisma/client";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function listNotifications() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  try {
    return ok(
      await prisma.notification.findMany({
        where: {
          householdId: household.id,
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 50,
      }),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to load the notifications. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export type NotificationItem = Notification;

export async function markAllRead() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  try {
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
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to mark the notifications as read. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
