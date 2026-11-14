import { redirect } from "next/navigation";

import { getSimplifiedTransfers } from "@/lib/balances";
import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const transfers = await getSimplifiedTransfers(result.household.id);

  return Response.json(transfers);
}
