import { redirect } from "next/navigation";

import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function GET(request: Request): Promise<Response> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);

  let range;
  try {
    range = resolveDateRange(
      searchParams.get("from") ?? undefined,
      searchParams.get("to") ?? undefined,
    );
  } catch (cause) {
    if (!(cause instanceof DomainError)) throw cause;
    return Response.json({ message: cause.message }, { status: 400 });
  }

  const stats = await getCategoriesStats(
    result.household.id,
    range.from,
    range.to,
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

  return stats.map((row) => ({
    ...row,
    _sum: {
      ...row._sum,
      amount: row._sum.amount?.toNumber() ?? 0,
    },
  }));
}
