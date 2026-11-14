"use server";

import type {
  CreateBudgetSchemaType,
  DeleteBudgetSchemaType,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  getBudgetsWithProgress,
  updateHouseholdBudget,
} from "@/lib/budgets";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import {
  CreateBudgetSchema,
  DeleteBudgetSchema,
  UpdateBudgetSchema,
} from "@/schemas/budgets";

export async function listBudgets() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getBudgetsWithProgress(result.household.id);
}

export async function createBudget(form: CreateBudgetSchemaType) {
  const parsedBody = CreateBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to create the budget. Select a category and enter a valid amount, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdBudget(
        result.household.id,
        parsedBody.data,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to create the budget. Select a category and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  const parsedBody = UpdateBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to update the budget. Select a category and enter a valid amount, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdBudget(
        result.household.id,
        parsedBody.data,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to update the budget. Select a category and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function deleteBudget(form: DeleteBudgetSchemaType) {
  const parsedBody = DeleteBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to delete the budget. Check the budget and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdBudget(
        result.household.id,
        parsedBody.data.id,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to delete the budget. Check the budget and try again.",
        ),
      );
    }
    throw cause;
  }
}
