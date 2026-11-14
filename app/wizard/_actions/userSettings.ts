"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertFullMember, requireHousehold } from "@/lib/household";
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
  assertFullMember(result);
  const household = await prisma.household.update({
    where: {
      id: result.household.id,
    },
    data: {
      currency,
    },
  });

  // The currency is passed to the dashboard as a server-rendered prop, so the
  // pages that render it have to be re-rendered with the new value.
  revalidatePath("/", "layout");

  return household;
}
