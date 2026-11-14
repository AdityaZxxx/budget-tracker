import type { NextRequest } from "next/server";

import { z } from "zod";

import { getCategories } from "@/lib/categories";
import { unauthorized } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";

export async function GET(request: NextRequest) {
  const result = await requireHousehold();

  if (!result) {
    return unauthorized();
  }

  const { searchParams } = new URL(request.url);
  const paramType = searchParams.get("type");

  const validator = z.enum(["expense", "income"]).nullable();
  const queryParams = validator.safeParse(paramType);
  if (!queryParams.success) {
    return Response.json(
      {
        message: queryParams.error.issues[0]?.message ?? "Invalid type",
      },
      {
        status: 400,
      },
    );
  }

  const categories = await getCategories(result.household.id, queryParams.data);
  return Response.json(categories);
}
