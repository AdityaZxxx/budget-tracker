"use server";

import type {
  CreateBudgetSchemaType,
  DeleteBudgetSchemaType,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";

import { redirect } from "next/navigation";

import {
  createHouseholdBudget,
  deleteHouseholdBudget,
  getBudgetsWithProgress,
  updateHouseholdBudget,
} from "@/lib/budgets";
import { assertFullMember, requireHousehold } from "@/lib/household";
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
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await createHouseholdBudget(result.household.id, parsedBody.data);
}

export async function updateBudget(form: UpdateBudgetSchemaType) {
  const parsedBody = UpdateBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await updateHouseholdBudget(result.household.id, parsedBody.data);
}

export async function deleteBudget(form: DeleteBudgetSchemaType) {
  const parsedBody = DeleteBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await deleteHouseholdBudget(result.household.id, parsedBody.data.id);
}
