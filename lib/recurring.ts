import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertCanWrite } from "@/lib/roles";
import {
  CreateRecurringItemSchema,
  UpdateRecurringItemSchema,
  type CreateRecurringItemType,
  type UpdateRecurringItemType,
} from "@/schemas/recurring";

export type RecurringItemRow = {
  id: string;
  householdId: string;
  name: string;
  amount: number;
  category: string;
  categoryIcon: string;
  type: string;
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paused: boolean;
  lastPostedAt: Date | null;
  createdAt: Date;
  dueDate: Date | null;
  isDue: boolean;
  isOverdue: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const utcStartOfDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * MS_PER_DAY);

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const clampToMonth = (year: number, month: number, day: number) =>
  Math.min(day, daysInMonth(year, month));

function firstWeeklyOnOrAfter(first: Date, weekday: number) {
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return addDays(first, delta);
}

function firstMonthlyOnOrAfter(first: Date, dayOfMonth: number) {
  const year = first.getUTCFullYear();
  const month = first.getUTCMonth();
  const clamped = clampToMonth(year, month, dayOfMonth);
  if (first.getUTCDate() <= clamped) {
    return new Date(Date.UTC(year, month, clamped));
  }
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  return new Date(
    Date.UTC(
      nextYear,
      nextMonth,
      clampToMonth(nextYear, nextMonth, dayOfMonth),
    ),
  );
}

// The occurrence on or before `day` (a UTC start of day), or null when the
// item has none yet or is finished. An explicit startDate bounds which
// occurrences exist; without one, the most recent past occurrence is what a
// member owes.
export function occurrenceOnOrBefore(
  item: {
    frequency: string;
    weekday: number | null;
    dayOfMonth: number | null;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  },
  day: Date,
): Date | null {
  const today = utcStartOfDay(day);
  if (item.endDate && today.getTime() > utcStartOfDay(item.endDate).getTime()) {
    return null;
  }
  const first = item.startDate ? utcStartOfDay(item.startDate) : null;

  if (item.frequency === "weekly") {
    if (item.weekday === null) return null;
    const daysBack = (today.getUTCDay() - item.weekday + 7) % 7;
    const occurrence = addDays(today, -daysBack);
    if (!first) return occurrence;
    const firstOccurrence = firstWeeklyOnOrAfter(first, item.weekday);
    return occurrence.getTime() >= firstOccurrence.getTime()
      ? occurrence
      : null;
  }

  if (item.dayOfMonth === null) return null;
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const thisMonthDay = clampToMonth(year, month, item.dayOfMonth);
  let occurrence: Date;
  if (today.getUTCDate() >= thisMonthDay) {
    occurrence = new Date(Date.UTC(year, month, thisMonthDay));
  } else {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    occurrence = new Date(
      Date.UTC(
        prevYear,
        prevMonth,
        clampToMonth(prevYear, prevMonth, item.dayOfMonth),
      ),
    );
  }
  if (!first) return occurrence;
  const firstOccurrence = firstMonthlyOnOrAfter(first, item.dayOfMonth);
  return occurrence.getTime() >= firstOccurrence.getTime() ? occurrence : null;
}

export function isRecurringItemDue(
  item: {
    paused: boolean;
    frequency: string;
    weekday: number | null;
    dayOfMonth: number | null;
    startDate: Date | null;
    endDate: Date | null;
    lastPostedAt: Date | null;
    createdAt: Date;
  },
  now: Date = new Date(),
): boolean {
  if (item.paused) return false;
  const occurrence = occurrenceOnOrBefore(item, now);
  if (!occurrence) return false;
  return (
    !item.lastPostedAt ||
    utcStartOfDay(item.lastPostedAt).getTime() < occurrence.getTime()
  );
}

function toRow(item: {
  id: string;
  householdId: string;
  name: string;
  amount: { toNumber(): number };
  category: string;
  categoryIcon: string;
  type: string;
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paused: boolean;
  lastPostedAt: Date | null;
  createdAt: Date;
}): RecurringItemRow {
  const dueDate = occurrenceOnOrBefore(item, new Date());
  const today = utcStartOfDay(new Date());
  return {
    ...item,
    amount: item.amount.toNumber(),
    dueDate,
    isDue: isRecurringItemDue(item),
    isOverdue: dueDate !== null && dueDate.getTime() < today.getTime(),
  };
}

export async function listRecurringItems(householdId: string) {
  const items = await prisma.recurringItem.findMany({
    where: { householdId },
    orderBy: [{ createdAt: "asc" }],
  });
  return items.map(toRow);
}

async function resolveCategory(
  householdId: string,
  type: string,
  name: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      householdId,
      name,
      type,
    },
  });
  if (!category) {
    throw new DomainError("Category not found");
  }
  return category;
}

type ParsedRecurringItem = z.output<typeof CreateRecurringItemSchema>;

function scheduleFields(input: ParsedRecurringItem) {
  return input.frequency === "weekly"
    ? { weekday: input.weekday ?? null, dayOfMonth: null }
    : { weekday: null, dayOfMonth: input.dayOfMonth ?? null };
}

export async function createRecurringItem(
  householdId: string,
  input: CreateRecurringItemType,
  role: string,
) {
  assertCanWrite(role);
  const parsed = CreateRecurringItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const category = await resolveCategory(
    householdId,
    parsed.data.type,
    parsed.data.category,
  );
  return prisma.recurringItem.create({
    data: {
      householdId,
      name: parsed.data.name,
      amount: parsed.data.amount,
      category: category.name,
      categoryIcon: category.icon,
      type: parsed.data.type,
      frequency: parsed.data.frequency,
      ...scheduleFields(parsed.data),
      startDate: parsed.data.startDate ?? null,
      endDate: parsed.data.endDate ?? null,
    },
  });
}

export async function updateRecurringItem(
  householdId: string,
  input: UpdateRecurringItemType,
  role: string,
) {
  assertCanWrite(role);
  const parsed = UpdateRecurringItemSchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(parsed.error.issues[0]?.message ?? "Invalid bill");
  }

  const existing = await prisma.recurringItem.findFirst({
    where: {
      id: parsed.data.id,
      householdId,
    },
  });
  if (!existing) {
    throw new DomainError("Bill not found");
  }
  const category = await resolveCategory(
    householdId,
    parsed.data.type,
    parsed.data.category,
  );
  const data: Prisma.RecurringItemUpdateInput = {
    name: parsed.data.name,
    amount: parsed.data.amount,
    category: category.name,
    categoryIcon: category.icon,
    type: parsed.data.type,
    frequency: parsed.data.frequency,
    ...scheduleFields(parsed.data),
    startDate: parsed.data.startDate ?? null,
    endDate: parsed.data.endDate ?? null,
  };
  if (parsed.data.paused !== undefined) {
    data.paused = parsed.data.paused;
  }
  return prisma.recurringItem.update({
    where: {
      id: existing.id,
    },
    data,
  });
}

export async function setRecurringItemPaused(
  householdId: string,
  id: string,
  paused: boolean,
  role: string,
) {
  assertCanWrite(role);
  const result = await prisma.recurringItem.updateMany({
    where: {
      id,
      householdId,
    },
    data: {
      paused,
    },
  });
  if (result.count === 0) {
    throw new DomainError("Bill not found");
  }
}

export async function deleteRecurringItem(
  householdId: string,
  id: string,
  role: string,
) {
  assertCanWrite(role);
  const result = await prisma.recurringItem.deleteMany({
    where: {
      id,
      householdId,
    },
  });
  if (result.count === 0) {
    throw new DomainError("Bill not found");
  }
}
