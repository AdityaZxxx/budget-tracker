"use server";

import { redirect } from "next/navigation";

import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
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

export async function getHouseholdBalances() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getMemberBalances(result.household.id, result.session.user.id);
}

export async function getSimplifiedDebts() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return await getSimplifiedTransfers(result.household.id);
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
