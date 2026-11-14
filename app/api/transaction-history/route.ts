import type { NextRequest } from "next/server";

import { resolveDateRange } from "@/lib/dates";
import { DomainError, unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { getTransactionsHistory } from "@/lib/transactions";

export async function GET(request: NextRequest) {
  const result = await requireHousehold();

  if (!result) {
    return unauthorized();
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
