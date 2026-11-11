import type { NextRequest } from "next/server";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import { getTransactionsHistory } from "@/lib/transactions";
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

  const transactions = await getTransactionsHistory(
    result.household.id,
    result.session.user.id,
    result.household.currency,
    queryParams.data.from,
    queryParams.data.to,
  );

  return Response.json(transactions);
}
