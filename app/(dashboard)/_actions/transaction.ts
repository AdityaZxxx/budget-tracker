"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";

import { getMonthSpentByCategory } from "@/lib/budgets";
import { getFormatterForCurrency } from "@/lib/helpers";
import { requireHousehold } from "@/lib/household";
import { notifyHouseholdExcept } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  CreateTransactionSchema,
  CreateTransactionSchemaType,
} from "@/schemas/transaction";

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

  const formatAmount = getFormatterForCurrency(
    household.currency ?? "USD",
  ).format;

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

  // Budgets only apply to shared expenses; personal transactions stay out.
  let thresholdMessage: string | null = null;
  if (type === "expense" && shared) {
    const budget = await prisma.budget.findUnique({
      where: {
        householdId_category: {
          householdId: household.id,
          category: categoryRow.name,
        },
      },
    });

    if (budget) {
      const spentByCategory = await getMonthSpentByCategory(household.id, date);
      const spentBefore = spentByCategory.get(categoryRow.name) ?? 0;
      const spentAfter = spentBefore + amount;
      const beforePercent = (spentBefore / budget.amount) * 100;
      const afterPercent = (spentAfter / budget.amount) * 100;

      if (budget.mode === "hard" && spentAfter > budget.amount) {
        throw new Error(
          `Hard budget exceeded for ${categoryRow.name}: the monthly limit is ${formatAmount(budget.amount)} and ${formatAmount(spentBefore)} is already spent, so this ${formatAmount(amount)} expense would bring the month to ${formatAmount(spentAfter)}.`,
        );
      }

      // One notification per transaction: report the highest threshold
      // crossed (100% covers a jump straight past 80%).
      if (beforePercent < 100 && afterPercent >= 100) {
        thresholdMessage = `${categoryRow.name} budget reached 100% of ${formatAmount(budget.amount)} this month (${formatAmount(spentAfter)} spent).`;
      } else if (beforePercent < 80 && afterPercent >= 80) {
        thresholdMessage = `${categoryRow.name} budget reached 80% of ${formatAmount(budget.amount)} this month (${formatAmount(spentAfter)} spent).`;
      }
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

  // The actor just made the transaction, so threshold warnings go to the
  // other members only. The write already landed, so the notification runs
  // after the response instead of holding it up.
  if (thresholdMessage) {
    const message = thresholdMessage;
    after(() =>
      notifyHouseholdExcept(
        household.id,
        session.user.id,
        "budget_threshold",
        message,
      ),
    );
  }
}
