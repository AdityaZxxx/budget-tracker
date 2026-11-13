import prisma from "@/lib/prisma";

// Sums MonthHistory into one bucket per month for the trailing six months,
// oldest first, with zero-filled gaps. MonthHistory only carries shared
// transactions, which is what the rest of the dashboard reports.
export async function getMonthlyRollup(householdId: string) {
  const now = new Date();
  const months: { year: number; month: number }[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    months.push({
      year: date.getUTCFullYear(),
      month: date.getUTCMonth(),
    });
  }

  const rows = await prisma.monthHistory.groupBy({
    by: ["year", "month"],
    where: {
      householdId,
      OR: months.map(({ year, month }) => ({ year, month })),
    },
    _sum: {
      income: true,
      expense: true,
    },
  });

  const byKey = new Map(
    rows.map((row) => [
      `${row.year}-${row.month}`,
      {
        income: row._sum.income?.toNumber() ?? 0,
        expense: row._sum.expense?.toNumber() ?? 0,
      },
    ]),
  );

  return months.map(({ year, month }) => ({
    year,
    month,
    income: byKey.get(`${year}-${month}`)?.income ?? 0,
    expense: byKey.get(`${year}-${month}`)?.expense ?? 0,
  }));
}

export type MonthlyRollup = Awaited<ReturnType<typeof getMonthlyRollup>>;
