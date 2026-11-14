import { z } from "zod";

import { amountNumber } from "@/schemas/money";

// The rules both surfaces that record a Settlement compose, so they cannot
// drift apart; the web coerces form strings, the MCP tool keeps the JSON
// types.
export function settlementFields(coerced: boolean) {
  return {
    memberId: z.string().min(1, "Select a member"),
    amount: amountNumber(coerced),
  };
}

export const RecordSettlementSchema = z.object(settlementFields(true));

export type RecordSettlementSchemaType = z.infer<typeof RecordSettlementSchema>;
