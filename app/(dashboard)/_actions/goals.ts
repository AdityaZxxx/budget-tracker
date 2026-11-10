"use server";

import { redirect } from "next/navigation";

import { createHouseholdGoal, getGoalsWithProgress } from "@/lib/goals";
import { assertFullMember, requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateGoalSchema,
  CreateGoalSchemaType,
  DeleteGoalSchema,
  DeleteGoalSchemaType,
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

  const { household } = result;

  // Contribution transactions survive the goal; onDelete: SetNull clears
  // their goalId so the money stays in the ledger.
  return await prisma.goal.delete({
    where: {
      id: parsedBody.data.id,
      householdId: household.id,
    },
  });
}
