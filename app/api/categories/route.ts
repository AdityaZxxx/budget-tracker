import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";

import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
export async function GET(request: NextRequest) {
  const result = await requireHousehold();

  if (!result) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const paramType = searchParams.get("type");

  const validator = z.enum(["expense", "income"]).nullable();
  const queryParams = validator.safeParse(paramType);
  if (!queryParams.success) {
    return Response.json(queryParams.error, {
      status: 400,
    });
  }

  const type = queryParams.data;
  const categories = await prisma.category.findMany({
    where: {
      householdId: result.household.id,
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
  return Response.json(categories);
}
