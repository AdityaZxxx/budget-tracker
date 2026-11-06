import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function GET() {
  const result = await requireHousehold();

  if (!result) {
    redirect("/sign-in");
  }

  const periods = await getHistoryPeriods(result.household.id);
  return Response.json(periods);
}

export type GetHistoryPeriodsResponseType = Awaited<
  ReturnType<typeof getHistoryPeriods>
>;

async function getHistoryPeriods(householdId: string) {
  const result = await prisma.monthHistory.findMany({
    where: {
      householdId,
    },
    select: {
      year: true,
    },
    distinct: ["year"],
    orderBy: [
      {
        year: "asc",
      },
    ],
  });
  const years = result.map((el) => el.year);
  if (years.length === 0) {
    return [new Date().getFullYear()];
  }
  return years;
}
