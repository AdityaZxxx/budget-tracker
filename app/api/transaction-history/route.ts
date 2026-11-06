import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

import { GetFormatterForCurrency } from "@/lib/helpers";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schemas/overview";

export async function GET(request: NextRequest) {
  const result = await requireHousehold();

  if (!result) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const queryParams = OverviewQuerySchema.safeParse({
    from,
    to,
  });

  if (!queryParams.success) {
    return Response.json(queryParams.error.message, {
      status: 400,
    });
  }

  const transactions = await getTrasactionsHistory(
    result.household.id,
    result.session.user.id,
    queryParams.data.from,
    queryParams.data.to,
  );

  return Response.json(transactions);
}

export type GetTrasactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTrasactionsHistory>
>;

async function getTrasactionsHistory(
  householdId: string,
  userId: string,
  from: Date,
  to: Date,
) {
  const household = await prisma.household.findUnique({
    where: {
      id: householdId,
    },
  });

  if (!household?.currency) {
    throw new Error("household currency not set");
  }

  const formatter = GetFormatterForCurrency(household.currency);

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      date: {
        gte: from,
        lte: to,
      },
      // Members see shared transactions plus their own personal ones.
      OR: [{ shared: true }, { addedById: userId }],
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
