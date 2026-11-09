import { getFormatterForCurrency } from "@/lib/helpers";
import prisma from "@/lib/prisma";

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
