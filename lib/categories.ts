import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import prisma from "@/lib/prisma";

export async function getCategories(
  householdId: string,
  type?: "expense" | "income" | null,
) {
  return await prisma.category.findMany({
    where: {
      householdId,
      // The system Settlement category is hidden from pickers and lists.
      name: {
        not: SETTLEMENT_CATEGORY_NAME,
      },
      ...(type && { type }),
    },
    orderBy: {
      name: "asc",
    },
  });
}
