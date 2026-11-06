"use server";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";

export async function UpdateUserCurrency(currency: string) {
  const parsedBody = UpdateUserCurrencySchema.safeParse({
    currency,
  });
  if (!parsedBody.success) {
    throw parsedBody.error;
  }
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  const household = await prisma.household.update({
    where: {
      id: result.household.id,
    },
    data: {
      currency,
    },
  });
  return household;
}
