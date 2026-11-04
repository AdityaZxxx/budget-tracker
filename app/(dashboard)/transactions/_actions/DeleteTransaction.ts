"use server";

import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function DeleteTransaction(id: string) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const transaction = await prisma.transaction.findUnique({
    where: {
      householdId: household.id,
      id,
    },
  });

  if (!transaction) {
    throw new Error("Bad request");
  }

  await prisma.$transaction([
    prisma.transaction.delete({
      where: {
        id,
        householdId: household.id,
      },
    }),
    // Personal transactions were never counted in the household rollups.
    ...(transaction.shared
      ? [
          prisma.monthHistory.update({
            where: {
              day_month_year_householdId: {
                householdId: household.id,
                day: transaction.date.getUTCDate(),
                month: transaction.date.getUTCMonth(),
                year: transaction.date.getUTCFullYear(),
              },
            },
            data: {
              ...(transaction.type === "expense" && {
                expense: {
                  decrement: transaction.amount,
                },
              }),
              ...(transaction.type === "income" && {
                income: {
                  decrement: transaction.amount,
                },
              }),
            },
          }),

          prisma.yearHistory.update({
            where: {
              month_year_householdId: {
                householdId: household.id,
                month: transaction.date.getUTCMonth(),
                year: transaction.date.getUTCFullYear(),
              },
            },
            data: {
              ...(transaction.type === "expense" && {
                expense: {
                  decrement: transaction.amount,
                },
              }),
              ...(transaction.type === "income" && {
                income: {
                  decrement: transaction.amount,
                },
              }),
            },
          }),
        ]
      : []),
  ]);
}
