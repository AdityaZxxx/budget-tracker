"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { setActiveHouseholdCookie } from "@/lib/household";
import { notify, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";

// Accepting an invite is an explicit button press, not a side effect of
// loading the link, because the join also sets the active-household cookie
// and cookies cannot be written while a page renders.
export async function joinHouseholdByToken(token: string) {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // The token is a bearer credential: holding it authorizes joining this
  // one household, so the membership is keyed only on household + user.
  const inviteLink = await prisma.inviteLink.findFirst({
    where: {
      token,
      revokedAt: null,
    },
  });
  if (!inviteLink) {
    throw new Error("This invite link is invalid or has been revoked");
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

    // The link creator gets a dedicated event; everyone else just sees the
    // join, so the creator is excluded from the member_joined fan-out.
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

  // Joining lands the member in the joined household, even when they
  // already belong to others.
  await setActiveHouseholdCookie(inviteLink.householdId);
  redirect("/");
}
