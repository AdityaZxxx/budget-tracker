import { requireHousehold } from "@/lib/household";
import { GetFormatterForCurrency } from "@/lib/helpers";
import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schemas/overview";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

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
    queryParams.data.from,
    queryParams.data.to
  );

  return Response.json(transactions);
}

export type GetTrasactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTrasactionsHistory>
>;

async function getTrasactionsHistory(householdId: string, from: Date, to: Date) {
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
    },
    orderBy: {
      date: "asc",
    },
  });

  return transactions.map((transaction) => ({
    ...transaction,
    formattedAmount: formatter.format(transaction.amount),
  }));
}
