import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
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

  const stats = await getCategoriesStats(
    result.household.id,
    queryParams.data.from,
    queryParams.data.to
  );
  return Response.json(stats);
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

async function getCategoriesStats(householdId: string, from: Date, to: Date) {
  const stats = await prisma.transaction.groupBy({
    by: ["type", "category", "categoryIcon"],
    where: {
      householdId,
      shared: true,
      // Settlements are not spending.
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
    orderBy: {
      _sum: {
        amount: "desc",
      },
    },
  });

  return stats;
}
