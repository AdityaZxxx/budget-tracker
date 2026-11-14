import type { NextRequest } from "next/server";

import { redirect } from "next/navigation";

import { resolveDateRange } from "@/lib/dates";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { getTransactionsHistory } from "@/lib/transactions";

export async function GET(request: NextRequest) {
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

  const transactions = await getTransactionsHistory(
    result.household.id,
    result.session.user.id,
    range.from,
    range.to,
  );

  return Response.json(transactions);
}
