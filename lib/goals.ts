import prisma from "@/lib/prisma";

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
