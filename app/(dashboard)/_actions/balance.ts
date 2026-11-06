"use server";

import { redirect } from "next/navigation";

import {
  SETTLEMENT_CATEGORY_ICON,
  SETTLEMENT_CATEGORY_NAME,
  SETTLEMENT_DESCRIPTION_PREFIX,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { requireHousehold } from "@/lib/household";
import { notify } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  RecordSettlementSchema,
  RecordSettlementSchemaType,
} from "@/schemas/settlement";

// balance is the net amount the caller owes the other member:
// shared expenses added by the other minus shared expenses added by the
// caller (each split evenly across members), minus settlements the caller
// paid to them plus settlements they paid to the caller.
export async function getHouseholdBalances() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;
  const callerId = session.user.id;

  const memberships = await prisma.householdMembership.findMany({
    where: {
      householdId: household.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  const memberCount = memberships.length;

  const [sharedExpenses, settlements] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        householdId: household.id,
        shared: true,
        type: "expense",
      },
      select: {
        addedById: true,
        amount: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        householdId: household.id,
        shared: false,
        type: "expense",
        category: SETTLEMENT_CATEGORY_NAME,
      },
      select: {
        addedById: true,
        amount: true,
        description: true,
      },
    }),
  ]);

  const memberIdByName = new Map(
    memberships.map((membership) => [membership.user.name, membership.user.id]),
  );

  return memberships
    .filter((membership) => membership.user.id !== callerId)
    .map((membership) => {
      const otherId = membership.user.id;
      let balance = 0;

      for (const expense of sharedExpenses) {
        if (expense.addedById === otherId) {
          balance += expense.amount / memberCount;
        } else if (expense.addedById === callerId) {
          balance -= expense.amount / memberCount;
        }
      }

      for (const settlement of settlements) {
        const payeeId = settlement.description.startsWith(
          SETTLEMENT_DESCRIPTION_PREFIX,
        )
          ? memberIdByName.get(
              settlement.description.slice(
                SETTLEMENT_DESCRIPTION_PREFIX.length,
              ),
            )
          : undefined;
        if (!payeeId) continue;

        if (settlement.addedById === callerId && payeeId === otherId) {
          balance -= settlement.amount;
        } else if (settlement.addedById === otherId && payeeId === callerId) {
          balance += settlement.amount;
        }
      }

      return {
        userId: otherId,
        name: membership.user.name,
        balance: Math.round(balance * 100) / 100,
      };
    });
}

export type HouseholdBalance = Awaited<
  ReturnType<typeof getHouseholdBalances>
>[number];

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const parsedBody = RecordSettlementSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;
  const { memberId, amount } = parsedBody.data;

  if (memberId === session.user.id) {
    throw new Error("Cannot record a settlement with yourself");
  }

  const membership = await prisma.householdMembership.findUnique({
    where: {
      householdId_userId: {
        householdId: household.id,
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
  });

  if (!membership) {
    throw new Error("Member not found");
  }

  const category = await prisma.category.upsert({
    where: {
      name_householdId_type: {
        householdId: household.id,
        name: SETTLEMENT_CATEGORY_NAME,
        type: "expense",
      },
    },
    create: {
      householdId: household.id,
      name: SETTLEMENT_CATEGORY_NAME,
      icon: SETTLEMENT_CATEGORY_ICON,
      type: "expense",
    },
    update: {},
  });

  // The payer records the settlement; shared=false keeps it out of
  // spending totals and budgets while balance math still counts it.
  await prisma.transaction.create({
    data: {
      householdId: household.id,
      addedById: session.user.id,
      amount,
      date: new Date(),
      description: `${SETTLEMENT_DESCRIPTION_PREFIX}${membership.user.name}`,
      type: "expense",
      shared: false,
      category: category.name,
      categoryIcon: category.icon,
    },
  });

  const amountText = getFormatterForCurrency(
    household.currency ?? "USD",
  ).format(amount);

  // The payee reads "with you"; other members see the payee's name.
  const otherMembers = await prisma.householdMembership.findMany({
    where: {
      householdId: household.id,
      userId: {
        not: session.user.id,
      },
    },
    select: {
      userId: true,
    },
  });
  await Promise.all(
    otherMembers.map((other) =>
      notify(
        household.id,
        other.userId,
        "settlement",
        other.userId === memberId
          ? `${session.user.name} recorded a settlement of ${amountText} with you.`
          : `${session.user.name} recorded a settlement of ${amountText} with ${membership.user.name}.`,
      ),
    ),
  );
}
