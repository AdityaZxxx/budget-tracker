"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireHousehold, updateHouseholdCurrency } from "@/lib/household";
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
  const household = await updateHouseholdCurrency(
    result.household.id,
    currency,
    result.membership.role,
  );

  // The currency is passed to the dashboard as a server-rendered prop, so the
  // pages that render it have to be re-rendered with the new value.
  revalidatePath("/", "layout");

  return household;
}
