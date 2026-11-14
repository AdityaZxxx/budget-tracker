"use server";

import type { Household } from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { fail, ok, type ActionResult } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold, updateHouseholdCurrency } from "@/lib/household";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";

export async function UpdateUserCurrency(
  currency: string,
): Promise<ActionResult<Household>> {
  // safeParse throws for this schema (the custom check throws inside it), so
  // the coarse filter needs its own try/catch to reject with a sentence.
  try {
    UpdateUserCurrencySchema.parse({ currency });
  } catch {
    return fail("That currency is not supported. Choose one from the list.");
  }
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    const household = await updateHouseholdCurrency(
      result.household.id,
      currency,
      result.membership.role,
    );

    // The currency is passed to the dashboard as a server-rendered prop, so the
    // pages that render it have to be re-rendered with the new value.
    revalidatePath("/", "layout");

    return ok(household);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }
}
