"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateGoalSchema,
  CreateGoalSchemaType,
  DeleteGoalSchema,
  DeleteGoalSchemaType,
} from "@/schemas/goals";
import { redirect } from "next/navigation";

export async function listGoals() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const [goals, contributionSums] = await Promise.all([
    prisma.goal.findMany({
      where: {
        householdId: household.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.transaction.groupBy({
      by: ["goalId"],
      where: {
        householdId: household.id,
        goalId: {
          not: null,
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const contributedByGoalId = new Map(
    contributionSums.map((row) => [row.goalId, row._sum.amount ?? 0])
  );

  return goals.map((goal) => ({
    ...goal,
    contributed: contributedByGoalId.get(goal.id) ?? 0,
  }));
}

export type GoalWithProgress = Awaited<ReturnType<typeof listGoals>>[number];

export async function createGoal(form: CreateGoalSchemaType) {
  const parsedBody = CreateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const { name, target, deadline } = parsedBody.data;
  return await prisma.goal.create({
    data: {
      householdId: household.id,
      name,
      target,
      deadline: deadline ?? null,
    },
  });
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
