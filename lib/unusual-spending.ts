import {
  FULL_MEMBER_ROLE,
  SETTLEMENT_CATEGORY_NAME,
  UNUSUAL_SPENDING_TYPE,
} from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { notifyMembers } from "@/lib/notifications";
import prisma from "@/lib/prisma";

const FLOOR_MINIMUM = 100;
const INCOME_FLOOR_RATIO = 0.005;
const SPIKE_MULTIPLIER = 2;

export type SpendingCandidate = {
  amount: number;
  category: string;
  description: string;
  type: string;
  shared: boolean;
  householdId: string;
  userId: string;
};

type Window = { start: Date; end: Date };

// The three complete UTC calendar months before the current one. The
// current month is partial, so it is never used as a baseline.
export function trailingWindow(now: Date = new Date()): Window {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1),
  );
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { start, end };
}

async function trailingMonthlyIncome(householdId: string, window: Window) {
  const months: { year: number; month: number }[] = [];
  const cursor = new Date(window.start.getTime());
  for (let index = 0; index < 3; index += 1) {
    months.push({
      year: cursor.getUTCFullYear(),
      month: cursor.getUTCMonth(),
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  const rows = await prisma.monthHistory.findMany({
    where: {
      householdId,
      OR: months,
    },
  });
  const total = rows.reduce((sum, row) => sum + row.income.toNumber(), 0);
  return total / 3;
}

// max(100 in the household currency, 0.5% of the trailing monthly household
// income). A category has to be "big" in this household before a spike in it
// is worth telling anyone about.
export function floorFor(trailingIncome: number) {
  return Math.max(
    FLOOR_MINIMUM,
    Math.round(trailingIncome * INCOME_FLOOR_RATIO * 100) / 100,
  );
}

export async function evaluateUnusualSpending(
  transaction: SpendingCandidate,
): Promise<{ notified: number }> {
  if (transaction.type !== "expense") {
    return { notified: 0 };
  }
  if (transaction.category === SETTLEMENT_CATEGORY_NAME) {
    return { notified: 0 };
  }

  const window = trailingWindow();

  const sharedScope = transaction.shared
    ? { shared: true }
    : { shared: false, addedById: transaction.userId };

  const [baseline, trailingIncome] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        householdId: transaction.householdId,
        category: transaction.category,
        type: "expense",
        ...sharedScope,
        date: { gte: window.start, lt: window.end },
      },
    }),
    trailingMonthlyIncome(transaction.householdId, window),
  ]);

  const average = (baseline._sum.amount?.toNumber() ?? 0) / 3;
  if (average < floorFor(trailingIncome)) {
    return { notified: 0 };
  }
  if (transaction.amount <= SPIKE_MULTIPLIER * average) {
    return { notified: 0 };
  }

  const household = await prisma.household.findUnique({
    where: { id: transaction.householdId },
    select: { currency: true },
  });
  const format = getFormatterForCurrency(household?.currency ?? "USD").format;

  const recipients = transaction.shared
    ? await prisma.householdMembership.findMany({
        where: {
          householdId: transaction.householdId,
          role: FULL_MEMBER_ROLE,
        },
        select: { userId: true },
      })
    : [{ userId: transaction.userId }];

  const message = `Unusual spending: ${format(transaction.amount)} on ${transaction.description || transaction.category} (${transaction.category}) is more than twice the three-month average of ${format(average)}.`;

  await notifyMembers(
    transaction.householdId,
    recipients.map((recipient) => recipient.userId),
    UNUSUAL_SPENDING_TYPE,
    message,
  );
  return { notified: recipients.length };
}
