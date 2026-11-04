"use server";

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function DeleteTransaction(id: string) {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      userId: session.user.id,
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
        userId: session.user.id,
      },
    }),
    prisma.monthHistory.update({
      where: {
        day_month_year_userId: {
          userId: session.user.id,
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
        month_year_userId: {
          userId: session.user.id,
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
  ]);
}
