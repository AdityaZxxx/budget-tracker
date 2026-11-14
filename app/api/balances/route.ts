import { redirect } from "next/navigation";

import { getMemberBalances } from "@/lib/balances";
import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const balances = await getMemberBalances(
    result.household.id,
    result.session.user.id,
  );

  return Response.json(balances);
}
