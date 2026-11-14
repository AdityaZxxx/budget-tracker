"use server";

import { redirect } from "next/navigation";

import { requireHousehold } from "@/lib/household";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(id: string) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  await deleteTransaction(result.household.id, id, result.membership.role);
}
