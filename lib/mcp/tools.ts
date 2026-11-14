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
