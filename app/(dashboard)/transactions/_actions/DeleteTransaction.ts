"use server";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { deleteTransaction } from "@/lib/transactions";

export async function DeleteTransaction(id: string) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await deleteTransaction(result.household.id, id, result.membership.role);
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to delete the transaction. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
