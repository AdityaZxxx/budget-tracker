"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { getMonthSpentByCategory } from "@/lib/budgets";
import { getFormatterForCurrency } from "@/lib/helpers";
import { assertFullMember, requireHousehold } from "@/lib/household";
import { notifyHouseholdExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  CreateTransactionSchema,
  CreateTransactionSchemaType,
} from "@/schemas/transaction";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  const { session, household } = result;

  const formatAmount = getFormatterForCurrency(
    household.currency ?? "USD",
  ).format;

  const { amount, category, date, description, type, shared } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const shareInput =
    type === "expense" && shared ? (parsedBody.data.shares ?? []) : [];

  const [categoryRow, goal, memberships] = await Promise.all([
    prisma.category.findFirst({
      where: {
        householdId: household.id,
        name: category,
      },
    }),
    goalId
      ? prisma.goal.findFirst({
          where: {
            id: goalId,
            householdId: household.id,
          },
        })
      : null,
    shareInput.length > 0
      ? prisma.householdMembership.findMany({
          where: {
            householdId: household.id,
          },
          select: {
            userId: true,
          },
        })
      : [],
  ]);

  if (!categoryRow) {
    throw new Error("Category not found");
  }

  if (goalId && !goal) {
    throw new Error("Goal not found");
  }

  const memberIds = new Set(memberships.map((m) => m.userId));
  const shareUserIds = shareInput.map((share) => share.userId);
  const hasForeignOrDuplicateMember =
    shareUserIds.some((userId) => !memberIds.has(userId)) ||
    new Set(shareUserIds).size !== shareUserIds.length;
  if (hasForeignOrDuplicateMember) {
    throw new Error(
      "Shares must name each member of this household at most once",
    );
  }

  const shareSum = Math.round(
    shareInput.reduce((sum, share) => sum + share.amount, 0) * 100,
  );
  if (shareInput.length > 0 && shareSum !== Math.round(amount * 100)) {
    throw new Error(
      `The member shares add up to ${formatAmount(shareSum / 100)} but the expense is ${formatAmount(amount)}.`,
    );
  }

  // Budgets only apply to shared expenses; personal transactions stay out.
  let thresholdMessage: string | null = null;
  if (type === "expense" && shared) {
    const budget = await prisma.budget.findUnique({
      where: {
        householdId_category: {
          householdId: household.id,
          category: categoryRow.name,
        },
      },
    });

    if (budget) {
      const spentByCategory = await getMonthSpentByCategory(household.id, date);
      const spentBefore = spentByCategory.get(categoryRow.name) ?? 0;
      const spentAfter = spentBefore + amount;
      const beforePercent = (spentBefore / budget.amount) * 100;
      const afterPercent = (spentAfter / budget.amount) * 100;

      if (budget.mode === "hard" && spentAfter > budget.amount) {
        throw new Error(
          `Hard budget exceeded for ${categoryRow.name}: the monthly limit is ${formatAmount(budget.amount)} and ${formatAmount(spentBefore)} is already spent, so this ${formatAmount(amount)} expense would bring the month to ${formatAmount(spentAfter)}.`,
        );
      }

      // One notification per transaction: report the highest threshold
      // crossed (100% covers a jump straight past 80%).
      if (beforePercent < 100 && afterPercent >= 100) {
        thresholdMessage = `${categoryRow.name} budget reached 100% of ${formatAmount(budget.amount)} this month (${formatAmount(spentAfter)} spent).`;
      } else if (beforePercent < 80 && afterPercent >= 80) {
        thresholdMessage = `${categoryRow.name} budget reached 80% of ${formatAmount(budget.amount)} this month (${formatAmount(spentAfter)} spent).`;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        householdId: household.id,
        addedById: session.user.id,
        amount,
        date,
        description: description || "",
        type,
        shared,
        category: categoryRow.name,
        categoryIcon: categoryRow.icon,
        goalId,
      },
    });

    if (shareInput.length > 0) {
      await tx.transactionShare.createMany({
        data: shareInput.map((share) => ({
          transactionId: created.id,
          userId: share.userId,
          amount: share.amount,
        })),
      });
    }

    if (!shared) {
      return;
    }

    await tx.monthHistory.upsert({
      where: {
        day_month_year_householdId: {
          householdId: household.id,
          day: date.getUTCDate(),
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        householdId: household.id,
        day: date.getUTCDate(),
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    });

    await tx.yearHistory.upsert({
      where: {
        month_year_householdId: {
          householdId: household.id,
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        householdId: household.id,
        month: date.getUTCMonth(),
        year: date.getUTCFullYear(),
        expense: type === "expense" ? amount : 0,
        income: type === "income" ? amount : 0,
      },
      update: {
        expense: {
          increment: type === "expense" ? amount : 0,
        },
        income: {
          increment: type === "income" ? amount : 0,
        },
      },
    });
  });

  // The actor just made the transaction, so threshold warnings go to the
  // other members only. The write already landed, so the notification runs
  // after the response instead of holding it up.
  if (thresholdMessage) {
    const message = thresholdMessage;
    after(() =>
      notifyHouseholdExcept(
        household.id,
        session.user.id,
        "budget_threshold",
        message,
      ),
    );
  }

  if (shared) {
    const message = `${session.user.name} added a shared ${type} of ${formatAmount(amount)} (${description || categoryRow.name}).`;
    after(() =>
      notifyHouseholdExcept(
        household.id,
        session.user.id,
        "transaction",
        message,
      ),
    );
  }

  if (goal) {
    after(async () => {
      const contributed = await prisma.transaction.aggregate({
        where: {
          householdId: household.id,
          goalId: goal.id,
        },
        _sum: {
          amount: true,
        },
      });
      const contributedTotal = contributed._sum.amount ?? 0;
      const contributedBefore = contributedTotal - amount;
      if (contributedBefore >= goal.target || contributedTotal < goal.target) {
        return;
      }

      const members = await prisma.householdMembership.findMany({
        where: {
          householdId: household.id,
        },
        select: {
          userId: true,
        },
      });
      await notifyMembers(
        household.id,
        members.map((member) => member.userId),
        "goal_reached",
        `${goal.name} reached its target: ${formatAmount(contributedTotal)} of ${formatAmount(goal.target)}.`,
      );
    });
  }
}
