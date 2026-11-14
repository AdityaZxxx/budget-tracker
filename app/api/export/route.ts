import { redirect } from "next/navigation";

import { FULL_MEMBER_ROLE, requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  if (result.membership.role !== FULL_MEMBER_ROLE) {
    return Response.json(
      { message: "Only full members can export household data" },
      { status: 403 },
    );
  }

  const { session, household } = result;

  const [
    members,
    transactions,
    categories,
    goals,
    inviteLinks,
    budgets,
    notifications,
    transactionShares,
  ] = await Promise.all([
    prisma.householdMembership.findMany({
      where: { householdId: household.id },
      select: {
        joinedAt: true,
        emailDigest: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        householdId: household.id,
        OR: [{ shared: true }, { addedById: session.user.id }],
      },
      orderBy: { date: "desc" },
    }),
    prisma.category.findMany({
      where: { householdId: household.id },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "asc" },
    }),
    // Tokens are bearer credentials, so only metadata is exported.
    prisma.inviteLink.findMany({
      where: { householdId: household.id },
      select: {
        id: true,
        createdById: true,
        createdAt: true,
        revokedAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.budget.findMany({
      where: { householdId: household.id },
      orderBy: { createdAt: "asc" },
    }),
    // Only the caller's own notifications are exported.
    prisma.notification.findMany({
      where: { householdId: household.id, userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transactionShare.findMany({
      where: { transaction: { householdId: household.id } },
      orderBy: { transactionId: "asc" },
    }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    household: {
      id: household.id,
      currency: household.currency,
      createdAt: household.createdAt,
    },
    members: members.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      joinedAt: member.joinedAt,
      emailDigest: member.emailDigest,
    })),
    transactions: transactions.map((transaction) => ({
      ...transaction,
      amount: transaction.amount.toNumber(),
    })),
    categories,
    goals: goals.map((goal) => ({
      ...goal,
      target: goal.target.toNumber(),
    })),
    budgets: budgets.map((budget) => ({
      ...budget,
      amount: budget.amount.toNumber(),
    })),
    notifications,
    inviteLinks,
    transactionShares: transactionShares.map((share) => ({
      ...share,
      amount: share.amount.toNumber(),
    })),
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sora-export.json"',
    },
  });
}
