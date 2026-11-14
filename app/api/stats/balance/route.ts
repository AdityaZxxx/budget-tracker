import { resolveDateRange } from "@/lib/dates";
import { DomainError, unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { getBalanceStats } from "@/lib/transactions";

export async function GET(request: Request): Promise<Response> {
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

  const stats = await getBalanceStats(
    result.household.id,
    range.from,
    range.to,
  );

  return Response.json(stats);
}
