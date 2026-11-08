"use server";

import { redirect } from "next/navigation";

import {
  SETTLEMENT_CATEGORY_ICON,
  SETTLEMENT_CATEGORY_NAME,
  SETTLEMENT_DESCRIPTION_PREFIX,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { assertFullMember, requireHousehold } from "@/lib/household";
import { notify } from "@/lib/notifications";
import prisma from "@/lib/prisma";
import {
  RecordSettlementSchema,
  RecordSettlementSchemaType,
} from "@/schemas/settlement";

async function loadBalanceInputs(householdId: string) {
  const [memberships, sharedExpenses, settlements, expenseShares] =
    await Promise.all([
      prisma.householdMembership.findMany({
        where: {
          householdId,
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
      }),
      prisma.transaction.findMany({
        where: {
          householdId,
          shared: true,
          type: "expense",
        },
        select: {
          transactionId: true,
          addedById: true,
          amount: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          householdId,
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
      prisma.transactionShare.findMany({
        where: {
          transaction: {
            householdId,
            shared: true,
            type: "expense",
          },
        },
        select: {
          transactionId: true,
          userId: true,
          amount: true,
        },
      }),
    ]);

  const sharesByTransactionId = new Map<
    string,
    { userId: string; amount: number }[]
  >();
  for (const share of expenseShares) {
    const shares = sharesByTransactionId.get(share.transactionId);
    if (shares) {
      shares.push({ userId: share.userId, amount: share.amount });
    } else {
      sharesByTransactionId.set(share.transactionId, [
        { userId: share.userId, amount: share.amount },
      ]);
    }
  }

  return {
    memberships,
    sharedExpenses,
    settlements,
    sharesByTransactionId,
  };
}

function sharesOwedForExpense(
  expense: { transactionId: string; amount: number },
  memberships: { user: { id: string } }[],
  sharesByTransactionId: Map<string, { userId: string; amount: number }[]>,
  memberCount: number,
) {
  const owed = new Map<string, number>();
  const shares = sharesByTransactionId.get(expense.transactionId);
  if (shares) {
    for (const share of shares) {
      owed.set(share.userId, share.amount);
    }
    return owed;
  }

  const even = expense.amount / memberCount;
  for (const membership of memberships) {
    owed.set(membership.user.id, even);
  }
  return owed;
}

function settlementPayeeId(
  description: string,
  memberIdByName: Map<string, string>,
) {
  return description.startsWith(SETTLEMENT_DESCRIPTION_PREFIX)
    ? memberIdByName.get(
        description.slice(SETTLEMENT_DESCRIPTION_PREFIX.length),
      )
    : undefined;
}

export async function getHouseholdBalances() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;
  const callerId = session.user.id;

  const { memberships, sharedExpenses, settlements, sharesByTransactionId } =
    await loadBalanceInputs(household.id);

  const memberCount = memberships.length;

  const memberIdByName = new Map(
    memberships.map((membership) => [membership.user.name, membership.user.id]),
  );

  return memberships
    .filter((membership) => membership.user.id !== callerId)
    .map((membership) => {
      const otherId = membership.user.id;
      let balance = 0;

      for (const expense of sharedExpenses) {
        const owed = sharesOwedForExpense(
          expense,
          memberships,
          sharesByTransactionId,
          memberCount,
        );
        const callerShare = owed.get(callerId) ?? 0;
        const otherShare = owed.get(otherId) ?? 0;

        if (expense.addedById === otherId) {
          balance += callerShare;
        } else if (expense.addedById === callerId) {
          balance -= otherShare;
        }
      }

      for (const settlement of settlements) {
        const payeeId = settlementPayeeId(
          settlement.description,
          memberIdByName,
        );
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

export type SimplifiedTransfer = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
};

export async function getSimplifiedDebts(): Promise<SimplifiedTransfer[]> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const { memberships, sharedExpenses, settlements, sharesByTransactionId } =
    await loadBalanceInputs(household.id);

  const memberCount = memberships.length;

  const memberIdByName = new Map(
    memberships.map((membership) => [membership.user.name, membership.user.id]),
  );

  const netReceivableByUserId = new Map<string, number>(
    memberships.map((membership) => [membership.user.id, 0]),
  );

  for (const expense of sharedExpenses) {
    const owed = sharesOwedForExpense(
      expense,
      memberships,
      sharesByTransactionId,
      memberCount,
    );
    for (const [userId, amount] of owed) {
      if (userId === expense.addedById || amount === 0) continue;
      netReceivableByUserId.set(
        expense.addedById,
        (netReceivableByUserId.get(expense.addedById) ?? 0) + amount,
      );
      netReceivableByUserId.set(
        userId,
        (netReceivableByUserId.get(userId) ?? 0) - amount,
      );
    }
  }

  for (const settlement of settlements) {
    const payeeId = settlementPayeeId(settlement.description, memberIdByName);
    if (!payeeId) continue;

    netReceivableByUserId.set(
      settlement.addedById,
      (netReceivableByUserId.get(settlement.addedById) ?? 0) +
        settlement.amount,
    );
    netReceivableByUserId.set(
      payeeId,
      (netReceivableByUserId.get(payeeId) ?? 0) - settlement.amount,
    );
  }

  const EPSILON = 0.005;
  const creditors = memberships
    .map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      amount: netReceivableByUserId.get(membership.user.id) ?? 0,
    }))
    .filter((member) => member.amount > EPSILON)
    .toSorted((a, b) => b.amount - a.amount);
  const debtors = memberships
    .map((membership) => ({
      id: membership.user.id,
      name: membership.user.name,
      amount: netReceivableByUserId.get(membership.user.id) ?? 0,
    }))
    .filter((member) => member.amount < -EPSILON)
    .toSorted((a, b) => a.amount - b.amount);

  const transfers: SimplifiedTransfer[] = [];
  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount =
      Math.round(Math.min(creditor.amount, -debtor.amount) * 100) / 100;
    if (amount <= 0) break;

    transfers.push({
      fromUserId: debtor.id,
      fromName: debtor.name,
      toUserId: creditor.id,
      toName: creditor.name,
      amount,
    });

    creditor.amount -= amount;
    debtor.amount += amount;

    if (creditor.amount <= EPSILON) creditors.shift();
    if (-debtor.amount <= EPSILON) debtors.shift();
  }

  return transfers;
}

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const parsedBody = RecordSettlementSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

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
