import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import prisma from "@/lib/prisma";

// Budget months follow the UTC calendar: transaction dates are stored as
// UTC (dateToUtcDate) and the history rollups use UTC getters, so a
// transaction's budget month is the UTC month of its date.
export function monthRangeFor(date: Date): { from: Date; to: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

export function previousMonthRange(date: Date): { from: Date; to: Date } {
  return monthRangeFor(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  );
}

export function sharedSpendingFilter(
  householdId: string,
  range: { from: Date; to: Date },
) {
  return {
    householdId,
    shared: true,
    type: "expense" as const,
    category: {
      not: SETTLEMENT_CATEGORY_NAME,
    },
    date: {
      gte: range.from,
      lte: range.to,
    },
  };
}

// Shared expense totals per category for the calendar month containing
// `date`. Settlements are excluded: they are not spending.
export async function getMonthSpentByCategory(
  householdId: string,
  date: Date,
): Promise<Map<string, number>> {
  const { from, to } = monthRangeFor(date);
  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    where: sharedSpendingFilter(householdId, { from, to }),
    _sum: {
      amount: true,
    },
  });
  return new Map(rows.map((row) => [row.category, row._sum.amount ?? 0]));
}

export async function getBudgetsWithProgress(householdId: string) {
  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: {
        householdId,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getMonthSpentByCategory(householdId, new Date()),
  ]);

  return budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category) ?? 0;
    const percent = (spent / budget.amount) * 100;
    return {
      ...budget,
      spent,
      remaining: Math.round((budget.amount - spent) * 100) / 100,
      percent: Math.round(percent * 100) / 100,
    };
  });
}

export type BudgetWithProgress = Awaited<
  ReturnType<typeof getBudgetsWithProgress>
>[number];
