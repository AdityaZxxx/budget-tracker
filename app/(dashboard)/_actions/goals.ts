"use server";

import type {
  CreateGoalSchemaType,
  DeleteGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { redirect } from "next/navigation";

import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  getGoalsWithProgress,
  updateHouseholdGoal,
} from "@/lib/goals";
import { assertFullMember, requireHousehold } from "@/lib/household";
import {
  CreateGoalSchema,
  DeleteGoalSchema,
  UpdateGoalSchema,
} from "@/schemas/goals";

export async function listGoals() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getGoalsWithProgress(result.household.id);
}

export async function createGoal(form: CreateGoalSchemaType) {
  const parsedBody = CreateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await createHouseholdGoal(result.household.id, parsedBody.data);
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  const parsedBody = UpdateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await updateHouseholdGoal(result.household.id, parsedBody.data);
}

export async function deleteGoal(form: DeleteGoalSchemaType) {
  const parsedBody = DeleteGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  return await deleteHouseholdGoal(result.household.id, parsedBody.data.id);
}
