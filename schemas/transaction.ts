import { z } from "zod";

export const CreateTransactionSchema = z.object({
  amount: z.coerce.number().positive().multipleOf(0.01),
  description: z.string().optional(),
  date: z.coerce.date(),
  category: z.string().min(1, "Select a category"),
  type: z.union([z.literal("income"), z.literal("expense")]),
  shared: z.boolean().default(true),
});

export type CreateTransactionSchemaType = {
  amount: number;
  description?: string;
  date: Date;
  category: string;
  type: "income" | "expense";
  shared: boolean;
};
export type CreateTransactionSchemaOutput = z.output<
  typeof CreateTransactionSchema
>;
