import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import prisma from "@/lib/prisma";
import { CreateBudgetSchema, UpdateBudgetSchema } from "@/schemas/budgets";

// Budget months follow the UTC calendar: transaction dates are stored as UTC
// (dateToUtcDate) and the rollups bucket them with UTC getters, so a
// transaction's budget month is its UTC month.
export function monthRangeFor(date: Date): { from: Date; to: Date } {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)),
    to: new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)),
  };
}

export function previousMonthRange(date: Date): { from: Date; to: Date } {
  return monthRangeFor(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1)),
  );
}

export function sharedSpendingFilter(
  householdId: string,
  range: { from: Date; to: Date },
) {
  return {
    householdId,
    shared: true,
    type: "expense" as const,
    category: {
      not: SETTLEMENT_CATEGORY_NAME,
    },
    date: {
      gte: range.from,
      lte: range.to,
    },
  };
}

// Settlements are excluded: a settlement moves money between Members, it is
// not spending.
export async function getMonthSpentByCategory(
  householdId: string,
  date: Date,
): Promise<Map<string, number>> {
  const { from, to } = monthRangeFor(date);
  const rows = await prisma.transaction.groupBy({
    by: ["category"],
    where: sharedSpendingFilter(householdId, { from, to }),
    _sum: {
      amount: true,
    },
  });
  return new Map(rows.map((row) => [row.category, row._sum.amount ?? 0]));
}

export async function getBudgetsWithProgress(householdId: string) {
  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: {
        householdId,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getMonthSpentByCategory(householdId, new Date()),
  ]);

  return budgets.map((budget) => {
    const spent = spentByCategory.get(budget.category) ?? 0;
    const percent = (spent / budget.amount) * 100;
    return {
      ...budget,
      spent,
      remaining: Math.round((budget.amount - spent) * 100) / 100,
      percent: Math.round(percent * 100) / 100,
    };
  });
}

export type BudgetWithProgress = Awaited<
  ReturnType<typeof getBudgetsWithProgress>
>[number];

export type BudgetMode = "soft" | "hard";

export type CreateBudgetInput = {
  category: string;
  amount: number;
  mode: BudgetMode;
};

export type UpdateBudgetInput = CreateBudgetInput & {
  id: string;
};

async function findExpenseCategory(householdId: string, name: string) {
  const category = await prisma.category.findFirst({
    where: {
      householdId,
      name,
      type: "expense",
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return category;
}

export async function createHouseholdBudget(
  householdId: string,
  input: CreateBudgetInput,
) {
  const parsed = CreateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  const { category, amount, mode } = parsed.data;
  const expenseCategory = await findExpenseCategory(householdId, category);

  return await prisma.budget.create({
    data: {
      householdId,
      category: expenseCategory.name,
      amount,
      mode,
    },
  });
}

export async function updateHouseholdBudget(
  householdId: string,
  input: UpdateBudgetInput,
) {
  const parsed = UpdateBudgetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid budget");
  }

  const { id, category, amount, mode } = parsed.data;
  const expenseCategory = await findExpenseCategory(householdId, category);

  return await prisma.budget.update({
    where: {
      id,
      householdId,
    },
    data: {
      category: expenseCategory.name,
      amount,
      mode,
    },
  });
}

export async function setHouseholdBudget(
  householdId: string,
  input: CreateBudgetInput,
) {
  const existing = await prisma.budget.findFirst({
    where: {
      householdId,
      category: input.category,
    },
  });

  if (existing) {
    return await updateHouseholdBudget(householdId, {
      ...input,
      id: existing.id,
    });
  }

  return await createHouseholdBudget(householdId, input);
}

export async function deleteHouseholdBudget(householdId: string, id: string) {
  return await prisma.budget.delete({
    where: {
      id,
      householdId,
    },
  });
}
