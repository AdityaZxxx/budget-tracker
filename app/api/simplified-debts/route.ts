import { getSimplifiedTransfers } from "@/lib/balances";
import { unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    return unauthorized();
  }

  const transfers = await getSimplifiedTransfers(result.household.id);

  return Response.json(transfers);
}
