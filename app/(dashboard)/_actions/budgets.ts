"use server";

import { getMonthSpentByCategory } from "@/lib/budgets";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateBudgetSchema,
  CreateBudgetSchemaType,
  DeleteBudgetSchema,
  DeleteBudgetSchemaType,
  UpdateBudgetSchema,
  UpdateBudgetSchemaType,
} from "@/schemas/budgets";
import { redirect } from "next/navigation";

export async function listBudgets() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({
      where: {
        householdId: household.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    getMonthSpentByCategory(household.id, new Date()),
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

export type BudgetWithProgress = Awaited<ReturnType<typeof listBudgets>>[number];

export async function createBudget(form: CreateBudgetSchemaType) {
  const parsedBody = CreateBudgetSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const category = await prisma.category.findFirst({
    where: {
      householdId: household.id,
      name: parsedBody.data.category,
      type: "expense",
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return await prisma.budget.create({
    data: {
      householdId: household.id,
      category: category.name,
      amount: parsedBody.data.amount,
      mode: parsedBody.data.mode,
    },
  });
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

  const { household } = result;

  const category = await prisma.category.findFirst({
    where: {
      householdId: household.id,
      name: parsedBody.data.category,
      type: "expense",
    },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  return await prisma.budget.update({
    where: {
      id: parsedBody.data.id,
      householdId: household.id,
    },
    data: {
      category: category.name,
      amount: parsedBody.data.amount,
      mode: parsedBody.data.mode,
    },
  });
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

  const { household } = result;

  return await prisma.budget.delete({
    where: {
      id: parsedBody.data.id,
      householdId: household.id,
    },
  });
}
