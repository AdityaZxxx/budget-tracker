import { z } from "zod";

const TransactionShareSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().nonnegative().multipleOf(0.01),
});

export const CreateTransactionSchema = z.object({
  amount: z.coerce.number().positive().multipleOf(0.01),
  description: z.string().optional(),
  date: z.coerce.date(),
  category: z.string().min(1, "Select a category"),
  type: z.union([z.literal("income"), z.literal("expense")]),
  shared: z.boolean().default(true),
  // Empty string means no goal (the form's unset value).
  goalId: z.string().optional(),
  shares: z.array(TransactionShareSchema).optional(),
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
