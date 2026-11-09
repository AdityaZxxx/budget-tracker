import { after } from "next/server";

import {
  SETTLEMENT_CATEGORY_ICON,
  SETTLEMENT_CATEGORY_NAME,
  SETTLEMENT_DESCRIPTION_PREFIX,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notify } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import { RecordSettlementSchema } from "@/schemas/settlement";

export type RecordSettlementInput = {
  memberId: string;
  amount: number;
  // null = added through the UI, "agent" = added through an assistant
  addedVia?: string | null;
};

// A Settlement is a personal Transaction the payer records to say they have
// paid the other Member back. It stays out of spending totals and Budgets,
// and its description names the payee because the balance math reads it
// back to know who was paid.
export async function recordSettlement(
  householdId: string,
  userId: string,
  input: RecordSettlementInput,
) {
  const parsedBody = RecordSettlementSchema.safeParse({
    memberId: input.memberId,
    amount: input.amount,
  });
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const { memberId, amount } = parsedBody.data;

  if (memberId === userId) {
    throw new Error("Cannot record a settlement with yourself");
  }

  const [membership, household, payer] = await Promise.all([
    prisma.householdMembership.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: memberId,
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.household.findUnique({
      where: {
        id: householdId,
      },
      select: {
        currency: true,
      },
    }),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
      },
    }),
  ]);

  if (!membership) {
    throw new Error("Member not found");
  }

  const category = await prisma.category.upsert({
    where: {
      name_householdId_type: {
        householdId,
        name: SETTLEMENT_CATEGORY_NAME,
        type: "expense",
      },
    },
    create: {
      householdId,
      name: SETTLEMENT_CATEGORY_NAME,
      icon: SETTLEMENT_CATEGORY_ICON,
      type: "expense",
    },
    update: {},
  });

  // The payer records the Settlement; shared=false keeps it out of spending
  // totals and Budgets while balance math still counts it.
  const settlement = await prisma.transaction.create({
    data: {
      householdId,
      addedById: userId,
      amount,
      date: new Date(),
      description: `${SETTLEMENT_DESCRIPTION_PREFIX}${membership.user.name}`,
      type: "expense",
      shared: false,
      category: category.name,
      categoryIcon: category.icon,
      addedVia: input.addedVia ?? null,
    },
  });

  const amountText = getFormatterForCurrency(
    household?.currency ?? "USD",
  ).format(amount);
  const payerName = payer?.name ?? "A member";

  // The payee reads "with you"; other Members see the payee's name.
  after(async () => {
    const otherMembers = await prisma.householdMembership.findMany({
      where: {
        householdId,
        userId: {
          not: userId,
        },
      },
      select: {
        userId: true,
      },
    });

    await Promise.all(
      otherMembers.map((other) =>
        notify(
          householdId,
          other.userId,
          "settlement",
          other.userId === memberId
            ? `${payerName} recorded a settlement of ${amountText} with you.`
            : `${payerName} recorded a settlement of ${amountText} with ${membership.user.name}.`,
        ),
      ),
    );
  });

  return settlement;
}
