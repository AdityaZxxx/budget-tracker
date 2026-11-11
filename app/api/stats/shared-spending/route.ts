import { redirect } from "next/navigation";

import {
  monthRangeFor,
  previousMonthRange,
  sharedSpendingFilter,
} from "@/lib/budgets";
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
  const lastMonth = previousMonthRange(now);

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
    thisMonth: thisMonthTotal._sum.amount?.toNumber() ?? 0,
    lastMonth: lastMonthTotal._sum.amount?.toNumber() ?? 0,
  };
}
