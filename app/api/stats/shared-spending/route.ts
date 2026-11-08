import { redirect } from "next/navigation";

import { monthRangeFor } from "@/lib/budgets";
import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const stats = await getSharedSpending(result.household.id);

  return Response.json(stats);
}

export type GetSharedSpendingResponseType = Awaited<
  ReturnType<typeof getSharedSpending>
>;

async function getSharedSpending(householdId: string) {
  const now = new Date();
  const thisMonth = monthRangeFor(now);
  // Date.UTC normalizes a month of -1 into the previous December, so the
  // subtraction never needs explicit year rollover handling.
  const lastMonth = monthRangeFor(
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
  );

  // Settlements are excluded: a settlement is money moving between members,
  // not spending, matching what budgets count.
  const sumSharedExpenses = (range: { from: Date; to: Date }) =>
    prisma.transaction.aggregate({
      where: {
        householdId,
        shared: true,
        type: "expense",
        category: {
          not: SETTLEMENT_CATEGORY_NAME,
        },
        date: {
          gte: range.from,
          lte: range.to,
        },
      },
      _sum: {
        amount: true,
      },
    });

  const [thisMonthTotal, lastMonthTotal] = await Promise.all([
    sumSharedExpenses(thisMonth),
    sumSharedExpenses(lastMonth),
  ]);

  return {
    thisMonth: thisMonthTotal._sum.amount ?? 0,
    lastMonth: lastMonthTotal._sum.amount ?? 0,
  };
}
