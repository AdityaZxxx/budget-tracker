import { differenceInDays } from "date-fns";

import { MAX_DATE_RANGE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(value: string) {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    throw new DomainError(`Invalid date: ${value}. Use the YYYY-MM-DD format.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls 2026-02-30 into March 2 instead of failing, so reading
  // the parts back is what catches an impossible date.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new DomainError(`Invalid date: ${value}. Use the YYYY-MM-DD format.`);
  }

  return date;
}

export function startOfDay(value: string) {
  return parseDate(value);
}

export function endOfDay(value: string) {
  const date = parseDate(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

// The defaults read the caller's local calendar components and build a UTC
// date from them, so "this month" means their month, not UTC's.
export function resolveDateRange(from?: string, to?: string) {
  const now = new Date();

  const start = from
    ? startOfDay(from)
    : new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0));
  const end = to
    ? endOfDay(to)
    : new Date(
        Date.UTC(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999,
        ),
      );

  if (start > end) {
    throw new DomainError("The start date is after the end date.");
  }

  if (differenceInDays(end, start) > MAX_DATE_RANGE) {
    throw new DomainError(
      `The date range is longer than ${MAX_DATE_RANGE} days. Narrow it.`,
    );
  }

  return { from: start, to: end };
}
