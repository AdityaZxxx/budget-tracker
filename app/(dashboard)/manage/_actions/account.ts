"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth, getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    // Households where this user is the only member are deleted in one go.
    // `every` alone is also true for households without any membership, so
    // `some` is required to keep the user from removing unrelated households.
    const soleMemberHouseholds = await tx.household.findMany({
      where: {
        AND: [
          { memberships: { some: { userId } } },
          { memberships: { every: { userId } } },
        ],
      },
      select: { id: true },
    });

    await tx.household.deleteMany({
      where: { id: { in: soleMemberHouseholds.map(({ id }) => id) } },
    });

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
