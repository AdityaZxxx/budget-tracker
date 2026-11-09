import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import { z } from "zod";

// The tools answer with JSON in the text block. Agents read it, and the CLI
// parses it, so both sides see the same shape.
export function toolResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

// A failed tool call is a result the agent can read and react to, not a
// transport error, so the failure is reported in the result itself.
export function toolError(message: string): CallToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export const dateRangeShape = {
  from: z
    .string()
    .optional()
    .describe("Start date as YYYY-MM-DD. Defaults to the start of the month."),
  to: z
    .string()
    .optional()
    .describe("End date as YYYY-MM-DD. Defaults to today."),
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function endOfDay(value: string) {
  return new Date(`${value}T23:59:59.999Z`);
}

// The range is inclusive on both ends and defaults to the current calendar
// month, which is the range the dashboard opens on. The defaults use the
// caller's own calendar, so "this month" means the month they are in.
export function resolveDateRange(from?: string, to?: string) {
  const now = new Date();

  if (from && !DATE_PATTERN.test(from)) {
    throw new Error(`Invalid date: ${from}. Use the YYYY-MM-DD format.`);
  }
  if (to && !DATE_PATTERN.test(to)) {
    throw new Error(`Invalid date: ${to}. Use the YYYY-MM-DD format.`);
  }

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

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("The date range is not a real date.");
  }

  if (start > end) {
    throw new Error("The start date is after the end date.");
  }

  return { from: start, to: end };
}
