"use server";

import { redirect } from "next/navigation";

import { fail, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { setActiveHouseholdCookie } from "@/lib/household";
import { notify, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";

// The join lives in a Server Action rather than the page render: Next.js
// forbids writing cookies while a page renders.
export async function joinHouseholdByToken(
  token: string,
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const inviteLink = await prisma.inviteLink.findFirst({
    where: {
      token,
      revokedAt: null,
    },
  });
  if (!inviteLink) {
    return fail(
      "This invite link is invalid or has been revoked. Ask for a new one.",
    );
  }

  const existingMembership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    },
  });

  if (!existingMembership) {
    await prisma.householdMembership.create({
      data: {
        householdId: inviteLink.householdId,
        userId: session.user.id,
      },
    });

    const otherMembers = await prisma.householdMembership.findMany({
      where: {
        householdId: inviteLink.householdId,
        userId: {
          notIn: [session.user.id, inviteLink.createdById],
        },
      },
      select: {
        userId: true,
      },
    });
    await notifyMembers(
      inviteLink.householdId,
      otherMembers.map((membership) => membership.userId),
      "member_joined",
      `${session.user.name} joined the household.`,
    );
    if (inviteLink.createdById !== session.user.id) {
      await notify(
        inviteLink.householdId,
        inviteLink.createdById,
        "invite_accepted",
        `${session.user.name} accepted your invite and joined the household.`,
      );
    }
  }

  await setActiveHouseholdCookie(inviteLink.householdId);
  redirect("/");
}
