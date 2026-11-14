import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

import { DomainError } from "@/lib/errors";

// A tool's payload is the JSON an agent reads, so every value in it is a
// JSON value.
export type ToolPayload =
  | string
  | number
  | boolean
  | null
  | ToolPayload[]
  | { [key: string]: ToolPayload };

// No tool declares an output schema, so the SDK never expects
// structuredContent and the payload rides in the text block.
export function toolResult(data: ToolPayload): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// A tool failure is a result the agent can read and react to, not a
// transport error.
export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

// A domain rejection is the agent's fault, and its message is how to fix the
// call; any other failure is ours, and the agent gets generic copy instead
// of the internals.
export function toolErrorMessage(cause: unknown): string {
  return cause instanceof DomainError
    ? cause.message
    : "Something went wrong. Try again.";
}

export const dateRangeSchema = {
  from: z
    .string()
    .optional()
    .describe("Start date as YYYY-MM-DD. Defaults to the start of the month."),
  to: z
    .string()
    .optional()
    .describe("End date as YYYY-MM-DD. Defaults to today."),
};

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

  return { from: start, to: end };
}
