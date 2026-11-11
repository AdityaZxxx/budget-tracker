import prisma from "@/lib/prisma";
import { CreateGoalSchema } from "@/schemas/goals";

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
    contributionSums.map((row) => [row.goalId, row._sum.amount ?? 0]),
  );

  return goals.map((goal) => ({
    ...goal,
    contributed: contributedByGoalId.get(goal.id) ?? 0,
  }));
}

export type GoalWithProgress = Awaited<
  ReturnType<typeof getGoalsWithProgress>
>[number];

export type CreateGoalInput = {
  name: string;
  target: number;
  deadline?: Date;
};

// A Goal holds no money: contributions are Transactions tagged with it.
export async function createHouseholdGoal(
  householdId: string,
  input: CreateGoalInput,
) {
  const parsed = CreateGoalSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid goal");
  }

  const { name, target, deadline } = parsed.data;

  return await prisma.goal.create({
    data: {
      householdId,
      name,
      target,
      deadline: deadline ?? null,
    },
  });
}

// Contribution transactions survive the goal; onDelete: SetNull clears their
// goalId so the money stays in the ledger.
export async function deleteHouseholdGoal(householdId: string, id: string) {
  return await prisma.goal.delete({
    where: {
      id,
      householdId,
    },
  });
}
