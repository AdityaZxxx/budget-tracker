"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { redirect } from "next/navigation";

import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
import { requireHousehold } from "@/lib/household";
import { recordSettlement } from "@/lib/settlements";
import { RecordSettlementSchema } from "@/schemas/settlement";

export async function getHouseholdBalances() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getMemberBalances(result.household.id, result.session.user.id);
}

export async function getSimplifiedDebts() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getSimplifiedTransfers(result.household.id);
}

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const parsedBody = RecordSettlementSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  const { session, household } = result;
  const { memberId, amount } = parsedBody.data;

  await recordSettlement(
    household.id,
    session.user.id,
    { memberId, amount },
    result.membership.role,
  );
}
