"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateTransactionSchema,
  CreateTransactionSchemaType,
} from "@/schemas/transaction";
import { redirect } from "next/navigation";

export async function CreateTransaction(form: CreateTransactionSchemaType) {
  const parsedBody = CreateTransactionSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  const { amount, category, date, description, type, shared } = parsedBody.data;
  const goalId = parsedBody.data.goalId || undefined;
  const categoryRow = await prisma.category.findFirst({
    where: {
      householdId: household.id,
      name: category,
    },
  });

  if (!categoryRow) {
    throw new Error("Category not found");
  }

  if (goalId) {
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        householdId: household.id,
      },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }
  }

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        householdId: household.id,
        addedById: session.user.id,
        amount,
        date,
        description: description || "",
        type,
        shared,
        category: categoryRow.name,
        categoryIcon: categoryRow.icon,
        goalId,
      },
    }),

    // Personal transactions stay out of the household rollups.
    ...(shared
      ? [
          prisma.monthHistory.upsert({
            where: {
              day_month_year_householdId: {
                householdId: household.id,
                day: date.getUTCDate(),
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
              },
            },
            create: {
              householdId: household.id,
              day: date.getUTCDate(),
              month: date.getUTCMonth(),
              year: date.getUTCFullYear(),
              expense: type === "expense" ? amount : 0,
              income: type === "income" ? amount : 0,
            },
            update: {
              expense: {
                increment: type === "expense" ? amount : 0,
              },
              income: {
                increment: type === "income" ? amount : 0,
              },
            },
          }),

          prisma.yearHistory.upsert({
            where: {
              month_year_householdId: {
                householdId: household.id,
                month: date.getUTCMonth(),
                year: date.getUTCFullYear(),
              },
            },
            create: {
              householdId: household.id,
              month: date.getUTCMonth(),
              year: date.getUTCFullYear(),
              expense: type === "expense" ? amount : 0,
              income: type === "income" ? amount : 0,
            },
            update: {
              expense: {
                increment: type === "expense" ? amount : 0,
              },
              income: {
                increment: type === "income" ? amount : 0,
              },
            },
          }),
        ]
      : []),
  ]);
}
