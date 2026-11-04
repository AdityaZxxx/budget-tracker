import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { OverviewQuerySchema } from "@/schemas/overview";
import { redirect } from "next/navigation";

interface GetRequestParams {
  request: Request;
}

interface QueryParams {
  from: string | null;
  to: string | null;
}

export async function GET(request: Request): Promise<Response> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const from: QueryParams["from"] = searchParams.get("from");
  const to: QueryParams["to"] = searchParams.get("to");

  const queryParams = OverviewQuerySchema.safeParse({ from, to });

  if (!queryParams.success) {
    return Response.json(queryParams.error.message, {
      status: 400,
    });
  }

  const stats = await getBalanceStats(
    result.household.id,
    queryParams.data.from,
    queryParams.data.to
  );

  return Response.json(stats);
}

export type GetBalanceStatsResponseType = Awaited<
  ReturnType<typeof getBalanceStats>
>;

async function getBalanceStats(householdId: string, from: Date, to: Date) {
  const totals = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      householdId,
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
