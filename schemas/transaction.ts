import { z } from "zod";

import { amountNumber, sharesArray } from "@/schemas/money";

export const CreateTransactionSchema = z.object({
  amount: amountNumber(true),
  description: z.string().optional(),
  date: z.coerce.date(),
  category: z.string().min(1, "Select a category"),
  type: z.union([z.literal("income"), z.literal("expense")]),
  shared: z.boolean().default(true),
  // Empty string means no goal (the form's unset value).
  goalId: z.string().optional(),
  shares: sharesArray(true).optional(),
});

export type CreateTransactionSchemaType = {
  amount: number;
  description?: string;
  date: Date;
  category: string;
  type: "income" | "expense";
  shared: boolean;
  goalId?: string;
  shares?: { userId: string; amount: number }[];
};
export type CreateTransactionSchemaOutput = z.output<
  typeof CreateTransactionSchema
>;
