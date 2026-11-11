import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export const RecordSettlementSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  amount: amountNumber(true),
});

export type RecordSettlementSchemaType = z.infer<typeof RecordSettlementSchema>;
