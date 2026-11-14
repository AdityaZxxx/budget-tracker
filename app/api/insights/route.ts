import { unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { getMonthlyRollup } from "@/lib/insights";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    return unauthorized();
  }

  const months = await getMonthlyRollup(result.household.id);
  return Response.json(months);
}

export type GetInsightsResponseType = Awaited<
  ReturnType<typeof getMonthlyRollup>
>;
