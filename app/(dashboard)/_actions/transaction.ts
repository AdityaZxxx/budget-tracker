"use server";

import type { CreateTransactionSchemaType } from "@/schemas/transaction";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { createTransaction } from "@/lib/transactions";
import { CreateTransactionSchema } from "@/schemas/transaction";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to add the transaction. Check the amount, category and date, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
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

  try {
    await createTransaction(
      household.id,
      session.user.id,
      {
        amount,
        category,
        description,
        date,
        type,
        shared,
        goalId: goalId || undefined,
        shares,
        recurringItemId,
      },
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to add the transaction. Check the amount, category and date, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
