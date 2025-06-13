import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { GetFormatterForCurrency } from "../../../lib/helpers";
import { prisma } from "../../../lib/prisma";
import { OverviewQuerySchema } from "../../../schemas/overview";

export async function GET(request: NextRequest) {
  const user = await currentUser();

  if (!user) {
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
    user.id,
    queryParams.data.from,
    queryParams.data.to
  );

  return Response.json(transactions);
}

export type GetTrasactionsHistoryResponseType = Awaited<
  ReturnType<typeof getTrasactionsHistory>
>;

async function getTrasactionsHistory(userId: string, from: Date, to: Date) {
  const userSettings = await prisma.userSettings.findUnique({
    where: {
      userId,
    },
  });

  if (!userSettings) {
    throw new Error("user setting not found");
  }

  const formatter = GetFormatterForCurrency(userSettings.currency);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
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
