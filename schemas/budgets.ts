import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export const BudgetModeSchema = z.enum(["soft", "hard"]);

// The rules both surfaces that set a Budget compose, so they cannot drift
// apart; the web coerces form strings, the MCP tool keeps the JSON types.
export function budgetFields(coerced: boolean) {
  return {
    category: z.string().min(1, "Select a category"),
    amount: amountNumber(coerced),
    mode: BudgetModeSchema,
  };
}

const fields = budgetFields(true);

export const CreateBudgetSchema = z.object(fields);

// The schema uses z.coerce, so its input type differs from the form values;
// the values are already typed correctly client-side.
export type CreateBudgetSchemaType = {
  category: string;
  amount: number;
  mode: "soft" | "hard";
};

export const UpdateBudgetSchema = z.object({
  id: z.string().min(1),
  ...fields,
});

export type UpdateBudgetSchemaType = {
  id: string;
  category: string;
  amount: number;
  mode: "soft" | "hard";
};

export const DeleteBudgetSchema = z.object({
  id: z.string().min(1),
});

export type DeleteBudgetSchemaType = z.infer<typeof DeleteBudgetSchema>;
