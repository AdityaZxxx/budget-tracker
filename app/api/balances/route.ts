import { getMemberBalances } from "@/lib/balances";
import { unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    return unauthorized();
  }

  const balances = await getMemberBalances(
    result.household.id,
    result.session.user.id,
  );

  return Response.json(balances);
}
