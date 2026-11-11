"use server";

import { redirect } from "next/navigation";

import { assertFullMember, requireHousehold } from "@/lib/household";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(id: string) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  await deleteTransaction(result.household.id, id);
}
