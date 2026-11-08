import { redirect } from "next/navigation";

import { monthRangeFor, sharedSpendingFilter } from "@/lib/budgets";
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

  const sumSharedExpenses = (range: { from: Date; to: Date }) =>
    prisma.transaction.aggregate({
      where: sharedSpendingFilter(householdId, range),
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
