import type { TransactionType } from "@/lib/types";

import { after } from "next/server";

import { getMonthSpentByCategory } from "@/lib/budgets";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notifyHouseholdExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { CreateTransactionSchema } from "@/schemas/transaction";

export async function getTransactionsHistory(
  householdId: string,
  userId: string,
  currency: string | null,
  from: Date,
  to: Date,
  filters?: {
    category?: string;
    shared?: boolean;
  },
) {
  if (!currency) {
    throw new Error("household currency not set");
  }

  const formatter = getFormatterForCurrency(currency);

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      date: {
        gte: from,
        lte: to,
      },
      // Members see shared transactions plus their own personal ones.
      OR: [{ shared: true }, { addedById: userId }],
      ...(filters?.category && { category: filters.category }),
      ...(filters?.shared !== undefined && { shared: filters.shared }),
    },
    orderBy: {
      date: "asc",
    },
    include: {
      addedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return transactions.map(({ addedBy, ...transaction }) => ({
    ...transaction,
    addedByName: addedBy.name,
    formattedAmount: formatter.format(transaction.amount),
  }));
}

export type GetTransactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTransactionsHistory>
>;

export async function getBalanceStats(
  householdId: string,
  from: Date,
  to: Date,
) {
  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      householdId,
      shared: true,
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
  });

  return {
    expense: totals.find((t) => t.type === "expense")?._sum.amount || 0,

    income: totals.find((t) => t.type === "income")?._sum.amount || 0,
  };
}

export type GetBalanceStatsResponseType = Awaited<
  ReturnType<typeof getBalanceStats>
>;

export type CreateTransactionInput = {
  amount: number;
  category: string;
  description?: string;
  type: TransactionType;
  date: Date;
  shared?: boolean;
  goalId?: string;
  shares?: { userId: string; amount: number }[];
  // null = added through the UI, "agent" = added through an assistant
  addedVia?: string | null;
};

// The Household's Categories are the only labels a Transaction can carry, and
// each one belongs to a Household and a type, so an income Transaction needs
// an income Category.
async function resolveCategory(
  householdId: string,
  type: TransactionType,
  name: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      householdId,
      name,
      type,
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
}

export async function createTransaction(
  householdId: string,
  userId: string,
  input: CreateTransactionInput,
) {
  const categoryRow = await resolveCategory(
    householdId,
    input.type,
    input.category,
  );

  const parsedBody = CreateTransactionSchema.safeParse({
    ...input,
    category: categoryRow.name,
  });
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const { amount, date, description, type, shared } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const addedVia = input.addedVia ?? null;
  const shareInput =
    type === "expense" && shared ? (parsedBody.data.shares ?? []) : [];

  const [household, actor, goal, memberships] = await Promise.all([
    prisma.household.findUnique({
      where: {
        id: householdId,
      },
      select: {
        currency: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
      },
    }),
    goalId
      ? prisma.goal.findFirst({
          where: {
            id: goalId,
            householdId,
          },
        })
      : null,
    shareInput.length > 0
      ? prisma.householdMembership.findMany({
          where: {
            householdId,
          },
          select: {
            userId: true,
          },
        })
      : [],
  ]);

  if (goalId && !goal) {
    throw new Error("Goal not found");
  }

  const formatAmount = getFormatterForCurrency(
    household?.currency ?? "USD",
  ).format;

  const memberIds = new Set(memberships.map((m) => m.userId));
  const shareUserIds = shareInput.map((share) => share.userId);
  const hasForeignOrDuplicateMember =
    shareUserIds.some((shareUserId) => !memberIds.has(shareUserId)) ||
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
          householdId,
          category: categoryRow.name,
        },
      },
    });

    if (budget) {
      const spentByCategory = await getMonthSpentByCategory(householdId, date);
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

  const created = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        householdId,
        addedById: userId,
        amount,
        date,
        description: description || "",
        type,
        shared,
        category: categoryRow.name,
        categoryIcon: categoryRow.icon,
        goalId,
        addedVia,
      },
    });

    if (shareInput.length > 0) {
      await tx.transactionShare.createMany({
        data: shareInput.map((share) => ({
          transactionId: transaction.id,
          userId: share.userId,
          amount: share.amount,
        })),
      });
    }

    if (!shared) {
      return transaction;
    }

    await tx.monthHistory.upsert({
      where: {
        day_month_year_householdId: {
          householdId,
          day: date.getUTCDate(),
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        householdId,
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
          householdId,
          month: date.getUTCMonth(),
          year: date.getUTCFullYear(),
        },
      },
      create: {
        householdId,
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

    return transaction;
  });

  // The actor just made the transaction, so threshold warnings go to the
  // other members only.
  if (thresholdMessage) {
    const message = thresholdMessage;
    after(() =>
      notifyHouseholdExcept(householdId, userId, "budget_threshold", message),
    );
  }

  if (shared) {
    const message = `${actor?.name ?? "A member"} added a shared ${type} of ${formatAmount(amount)} (${description || categoryRow.name}).`;
    after(() =>
      notifyHouseholdExcept(householdId, userId, "transaction", message),
    );
  }

  // A Goal's progress is a Household aggregate, so it counts shared
  // Transactions only, the same figure the dashboard's Goals card shows. A
  // personal Transaction does not move that figure, so it cannot reach a
  // Goal either.
  if (goal && shared) {
    after(async () => {
      const contributed = await prisma.transaction.aggregate({
        where: {
          householdId,
          goalId: goal.id,
          shared: true,
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
          householdId,
        },
        select: {
          userId: true,
        },
      });
      await notifyMembers(
        householdId,
        members.map((member) => member.userId),
        "goal_reached",
        `${goal.name} reached its target: ${formatAmount(contributedTotal)} of ${formatAmount(goal.target)}.`,
      );
    });
  }

  return created;
}

export async function deleteTransaction(householdId: string, id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: {
      householdId,
      id,
    },
  });

  if (!transaction) {
    throw new Error("Bad request");
  }

  await prisma.$transaction([
    prisma.transaction.delete({
      where: {
        id,
        householdId,
      },
    }),
    // Personal transactions were never counted in the household rollups.
    ...(transaction.shared
      ? [
          prisma.monthHistory.update({
            where: {
              day_month_year_householdId: {
                householdId,
                day: transaction.date.getUTCDate(),
                month: transaction.date.getUTCMonth(),
                year: transaction.date.getUTCFullYear(),
              },
            },
            data: {
              ...(transaction.type === "expense" && {
                expense: {
                  decrement: transaction.amount,
                },
              }),
              ...(transaction.type === "income" && {
                income: {
                  decrement: transaction.amount,
                },
              }),
            },
          }),

          prisma.yearHistory.update({
            where: {
              month_year_householdId: {
                householdId,
                month: transaction.date.getUTCMonth(),
                year: transaction.date.getUTCFullYear(),
              },
            },
            data: {
              ...(transaction.type === "expense" && {
                expense: {
                  decrement: transaction.amount,
                },
              }),
              ...(transaction.type === "income" && {
                income: {
                  decrement: transaction.amount,
                },
              }),
            },
          }),
        ]
      : []),
  ]);
}
