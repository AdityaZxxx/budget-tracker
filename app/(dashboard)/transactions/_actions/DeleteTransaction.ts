"use server";

import type { DeleteIdSchemaType } from "@/schemas/delete";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { deleteTransaction } from "@/lib/transactions";
import { DeleteIdSchema } from "@/schemas/delete";

export async function DeleteTransaction(form: DeleteIdSchemaType) {
  const parsedBody = DeleteIdSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message ?? "",
        "Unable to delete the transaction. Check the details and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    await deleteTransaction(
      result.household.id,
      parsedBody.data.id,
      result.membership.role,
    );
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
