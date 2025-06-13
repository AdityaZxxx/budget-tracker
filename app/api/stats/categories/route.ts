import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { OverviewQuerySchema } from "../../../../schemas/overview";

interface GetRequestParams {
  request: Request;
}

interface QueryParams {
  from: string | null;
  to: string | null;
}

export async function GET(request: Request): Promise<Response> {
  const user = await currentUser();
  if (!user) {
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
    user.id,
    queryParams.data.from,
    queryParams.data.to
  );
  return Response.json(stats);
}

export type GetCategoriesStatsResponseType = Awaited<
  ReturnType<typeof getCategoriesStats>
>;

async function getCategoriesStats(userId: string, from: Date, to: Date) {
  const stats = await prisma.transaction.groupBy({
    by: ["type", "category", "categoryIcon"],
    where: {
      userId,
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
