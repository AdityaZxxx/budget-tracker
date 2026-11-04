import { z } from "zod";

export const RecordSettlementSchema = z.object({
  memberId: z.string().min(1, "Select a member"),
  amount: z.coerce.number().positive().multipleOf(0.01),
});

export type RecordSettlementSchemaType = z.infer<typeof RecordSettlementSchema>;
