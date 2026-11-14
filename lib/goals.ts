import { Prisma } from "@prisma/client";

import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import {
  CreateGoalSchema,
  type UpdateGoalSchemaType,
  UpdateGoalSchema,
} from "@/schemas/goals";

export async function getGoalsWithProgress(householdId: string) {
  const [goals, contributionSums] = await Promise.all([
    prisma.goal.findMany({
      where: {
        householdId,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.transaction.groupBy({
      by: ["goalId"],
      where: {
        householdId,
        goalId: {
          not: null,
        },
        shared: true,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const contributedByGoalId = new Map(
    contributionSums.map((row) => [
      row.goalId,
      row._sum.amount ?? new Prisma.Decimal(0),
    ]),
  );

  return goals.map((goal) => ({
    ...goal,
    target: goal.target.toNumber(),
    contributed: contributedByGoalId.get(goal.id)?.toNumber() ?? 0,
  }));
}

export type GoalWithProgress = Awaited<
  ReturnType<typeof getGoalsWithProgress>
>[number];

// Updates only the fields provided. `id` and `householdId` scope the write, so
// another household's Goal cannot be reached through a guessed id.
export async function updateHouseholdGoal(
  householdId: string,
  input: UpdateGoalSchemaType,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = UpdateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { id, name, target, deadline } = parsed.data;

  const data: Prisma.GoalUpdateInput = {};
  if (name !== undefined) {
    data.name = name;
  }
  if (target !== undefined) {
    data.target = target;
  }
  if (deadline !== undefined) {
    data.deadline = deadline;
  }
  if (Object.keys(data).length === 0) {
    throw new DomainError("Nothing to update");
  }

  const goal = await prisma.goal.update({
    where: {
      id,
      householdId,
    },
    data,
  });

  return { ...goal, target: goal.target.toNumber() };
}

export type CreateGoalInput = {
  name: string;
  target: number;
  deadline?: Date;
};

// A Goal holds no money: contributions are Transactions tagged with it.
export async function createHouseholdGoal(
  householdId: string,
  input: CreateGoalInput,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = CreateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { name, target, deadline } = parsed.data;

  const goal = await prisma.goal.create({
    data: {
      householdId,
      name,
      target,
      deadline: deadline ?? null,
    },
  });

  return { ...goal, target: goal.target.toNumber() };
}

// Contribution transactions survive the goal; onDelete: SetNull clears their
// goalId so the money stays in the ledger.
export async function deleteHouseholdGoal(
  householdId: string,
  id: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const goal = await prisma.goal.delete({
    where: {
      id,
      householdId,
    },
  });

  return { ...goal, target: goal.target.toNumber() };
}
