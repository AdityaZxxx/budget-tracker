import type { TransactionType } from "@/lib/types";

import { Prisma } from "@prisma/client";
import { after } from "next/server";

import { getMonthSpentByCategory } from "@/lib/budgets";
import { DomainError } from "@/lib/errors";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notifyHouseholdExcept, notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { assertCanWrite } from "@/lib/roles";
import { evaluateUnusualSpending } from "@/lib/unusual-spending";
import { CreateTransactionSchema } from "@/schemas/transaction";

export async function getTransactionsHistory(
  householdId: string,
  userId: string,
  from: Date,
  to: Date,
  filters?: {
    category?: string;
    shared?: boolean;
  },
) {
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
    // Only the columns the Transaction History view reads; the route is
    // polled, so its payload is paid for on every tick.
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      type: true,
      category: true,
      categoryIcon: true,
      shared: true,
      addedById: true,
      addedVia: true,
      addedBy: {
        select: {
          name: true,
        },
      },
    },
  });

  return transactions.map(({ addedBy, amount, ...transaction }) => ({
    ...transaction,
    amount: amount.toNumber(),
    addedByName: addedBy.name,
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
    expense:
      totals.find((t) => t.type === "expense")?._sum.amount?.toNumber() ?? 0,

    income:
      totals.find((t) => t.type === "income")?._sum.amount?.toNumber() ?? 0,
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
  recurringItemId?: string;
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
    throw new DomainError("Category not found");
  }

  return category;
}

export async function createTransaction(
  householdId: string,
  userId: string,
  input: CreateTransactionInput,
  role: string,
) {
  assertCanWrite(role);
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
    throw new DomainError(
      parsedBody.error.issues[0]?.message ?? "Invalid transaction input",
    );
  }

  const { amount, date, description, type, shared } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const addedVia = input.addedVia ?? null;
  const recurringItemId = input.recurringItemId || undefined;
  const shareInput =
    type === "expense" && shared ? (parsedBody.data.shares ?? []) : [];

  const [household, actor, goal, memberships, recurringItem] =
    await Promise.all([
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
      recurringItemId
        ? prisma.recurringItem.findFirst({
            where: {
              id: recurringItemId,
              householdId,
            },
          })
        : null,
    ]);

  if (goalId && !goal) {
    throw new DomainError("Goal not found");
  }
  if (recurringItemId && !recurringItem) {
    throw new DomainError("Recurring item not found");
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
    throw new DomainError(
      "Shares must name each member of this household at most once",
    );
  }

  const shareSum = Math.round(
    shareInput.reduce((sum, share) => sum + share.amount, 0) * 100,
  );
  if (shareInput.length > 0 && shareSum !== Math.round(amount * 100)) {
    throw new DomainError(
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
      const spentBefore =
        spentByCategory.get(categoryRow.name) ?? new Prisma.Decimal(0);
      const spentAfter = spentBefore.plus(amount);
      const budgetAmount = budget.amount;
      const beforePercent = budgetAmount.isZero()
        ? 0
        : spentBefore.div(budgetAmount).times(100).toNumber();
      const afterPercent = budgetAmount.isZero()
        ? 0
        : spentAfter.div(budgetAmount).times(100).toNumber();

      if (budget.mode === "hard" && spentAfter.gt(budgetAmount)) {
        throw new DomainError(
          `Hard budget exceeded for ${categoryRow.name}: the monthly limit is ${formatAmount(budgetAmount.toNumber())} and ${formatAmount(spentBefore.toNumber())} is already spent, so this ${formatAmount(amount)} expense would bring the month to ${formatAmount(spentAfter.toNumber())}.`,
        );
      }

      // One notification per transaction: report the highest threshold
      // crossed (100% covers a jump straight past 80%).
      if (beforePercent < 100 && afterPercent >= 100) {
        thresholdMessage = `${categoryRow.name} budget reached 100% of ${formatAmount(budgetAmount.toNumber())} this month (${formatAmount(spentAfter.toNumber())} spent).`;
      } else if (beforePercent < 80 && afterPercent >= 80) {
        thresholdMessage = `${categoryRow.name} budget reached 80% of ${formatAmount(budgetAmount.toNumber())} this month (${formatAmount(spentAfter.toNumber())} spent).`;
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

    if (recurringItem) {
      await tx.recurringItem.update({
        where: {
          id: recurringItem.id,
        },
        data: {
          lastPostedAt: new Date(),
        },
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
      const contributedTotal = contributed._sum.amount ?? new Prisma.Decimal(0);
      const contributedBefore = contributedTotal.minus(amount);
      if (
        contributedBefore.gte(goal.target) ||
        contributedTotal.lt(goal.target)
      ) {
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
        `${goal.name} reached its target: ${formatAmount(contributedTotal.toNumber())} of ${formatAmount(goal.target.toNumber())}.`,
      );
    });
  }

  after(() =>
    evaluateUnusualSpending({
      amount,
      category: categoryRow.name,
      description: description ?? "",
      type,
      shared,
      householdId,
      userId,
    }),
  );

  return created;
}

export async function deleteTransaction(
  householdId: string,
  id: string,
  role: string,
) {
  assertCanWrite(role);
  const transaction = await prisma.transaction.findUnique({
    where: {
      householdId,
      id,
    },
  });

  if (!transaction) {
    throw new DomainError("Bad request");
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
