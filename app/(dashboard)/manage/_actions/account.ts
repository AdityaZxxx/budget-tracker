"use server";

import { auth, getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function deleteAccount() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const userId = session.user.id;

  // Sign out before deleting so Better Auth clears the session cookie while
  // the session row still exists.
  await auth.api.signOut({
    headers: await headers(),
  });

  await prisma.$transaction(async (tx) => {
    const memberships = await tx.householdMembership.findMany({
      where: { userId },
      select: { householdId: true },
    });

    for (const { householdId } of memberships) {
      const otherMembers = await tx.householdMembership.count({
        where: { householdId, userId: { not: userId } },
      });
      if (otherMembers === 0) {
        await tx.household.delete({ where: { id: householdId } });
      }
    }

    // Verification has no FK to User; Better Auth keys these rows by the email
    // inside the identifier (email verification, password reset).
    await tx.verification.deleteMany({
      where: { identifier: { contains: session.user.email } },
    });

    // Cascades Session, Account, HouseholdMembership, InviteLink.createdBy,
    // and Transaction.addedBy.
    await tx.user.delete({ where: { id: userId } });
  });

  redirect("/sign-in");
}
