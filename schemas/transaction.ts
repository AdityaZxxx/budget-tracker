import { z } from "zod";

export const CreateTransactionSchema = z.object({
  amount: z.coerce.number().positive().multipleOf(0.01),
  description: z.string().optional(),
  date: z.coerce.date(),
  category: z.string(),
  type: z.union([z.literal("income"), z.literal("expense")]),
});

export type CreateTransactionSchemaType = {
  amount: number;
  description?: string;
  date: Date;
  category: string;
  type: "income" | "expense";
};
export type CreateTransactionSchemaOutput = z.output<
  typeof CreateTransactionSchema
>;
