import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import { getBalanceStats } from "@/lib/transactions";
import { OverviewQuerySchema } from "@/schemas/overview";

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
    queryParams.data.to,
  );

  return Response.json(stats);
}
