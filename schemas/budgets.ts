import { z } from "zod";

export const BudgetModeSchema = z.enum(["soft", "hard"]);

export const CreateBudgetSchema = z.object({
  category: z.string().min(1, "Select a category"),
  amount: z.coerce.number().positive().multipleOf(0.01),
  mode: BudgetModeSchema,
});

// The schema uses z.coerce, so its input type differs from the form values;
// the values are already typed correctly client-side.
export type CreateBudgetSchemaType = {
  category: string;
  amount: number;
  mode: "soft" | "hard";
};

export const UpdateBudgetSchema = z.object({
  id: z.string().min(1),
  category: z.string().min(1, "Select a category"),
  amount: z.coerce.number().positive().multipleOf(0.01),
  mode: BudgetModeSchema,
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
