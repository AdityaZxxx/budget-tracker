"use server";

import type { CreateTransactionSchemaType } from "@/schemas/transaction";

import { redirect } from "next/navigation";

import { assertFullMember, requireHousehold } from "@/lib/household";
import { createTransaction } from "@/lib/transactions";
import { CreateTransactionSchema } from "@/schemas/transaction";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  const { session, household } = result;
  const {
    amount,
    category,
    date,
    description,
    type,
    shared,
    goalId,
    shares,
    recurringItemId,
  } = parsedBody.data;

  await createTransaction(household.id, session.user.id, {
    amount,
    category,
    description,
    date,
    type,
    shared,
    goalId: goalId || undefined,
    shares,
    recurringItemId,
  });
}
