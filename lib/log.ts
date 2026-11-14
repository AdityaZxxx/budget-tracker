import { getRequestId } from "@/lib/request-id";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogOutcome = "ok" | "rejected" | "failed";

// The allowlist is the product: anything that can end up in a line is named
// here and typed. Money, names, emails, tokens and free text have no path in.
export type LogFields = {
  event: string;
  householdId?: string;
  userId?: string;
  outcome?: LogOutcome;
  durationMs?: number;
};

export function log(
  level: LogLevel,
  event: string,
  fields?: Omit<LogFields, "event">,
) {
  if (process.env.NODE_ENV === "production" && level === "debug") return;

  const line: Record<string, string | number> = {
    timestamp: new Date().toISOString(),
    level,
    event,
  };

  if (fields) {
    for (const key of [
      "householdId",
      "userId",
      "outcome",
      "durationMs",
    ] as const) {
      const value = fields[key];
      if (value !== undefined) line[key] = value;
    }
  }

  const requestId = getRequestId();
  if (requestId) line.requestId = requestId;

  console.log(JSON.stringify(line));
}

export const logDebug = (event: string, fields?: Omit<LogFields, "event">) =>
  log("debug", event, fields);
export const logInfo = (event: string, fields?: Omit<LogFields, "event">) =>
  log("info", event, fields);
export const logWarn = (event: string, fields?: Omit<LogFields, "event">) =>
  log("warn", event, fields);
export const logError = (event: string, fields?: Omit<LogFields, "event">) =>
  log("error", event, fields);
