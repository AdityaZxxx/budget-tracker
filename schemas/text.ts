import { z } from "zod";

// One free-text policy: trim, then min, then max. Both surfaces compose it.
export function freeText({
  min,
  max,
  minMessage,
  maxMessage,
}: {
  min?: number;
  max: number;
  minMessage?: string;
  maxMessage?: string;
}) {
  let schema = z.string().trim();
  if (min !== undefined && min > 0) {
    schema = schema.min(min, minMessage);
  }
  return schema.max(max, maxMessage);
}
