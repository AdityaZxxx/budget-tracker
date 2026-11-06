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

// Shared expense totals per category for the calendar month containing
// `date`. Settlements are excluded: they are not spending.
export async function getMonthSpentByCategory(
  householdId: string,
  date: Date,
): Promise<Map<string, number>> {
  const { from, to } = monthRangeFor(date);
  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    where: {
      householdId,
      shared: true,
      type: "expense",
      category: {
        not: SETTLEMENT_CATEGORY_NAME,
      },
      date: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      amount: true,
    },
  });
  return new Map(rows.map((row) => [row.category, row._sum.amount ?? 0]));
}
