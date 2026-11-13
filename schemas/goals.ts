import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export const CreateGoalSchema = z.object({
  name: z.string().min(1, "Enter a name").max(50),
  target: amountNumber(true),
  deadline: z.coerce.date().optional(),
});

// The schema uses z.coerce, so its input type differs from the form values;
// the values are already typed correctly client-side.
export type CreateGoalSchemaType = {
  name: string;
  target: number;
  deadline?: Date;
};

export const DeleteGoalSchema = z.object({
  id: z.string().min(1),
});

export type DeleteGoalSchemaType = z.infer<typeof DeleteGoalSchema>;

// A `null` deadline clears it; an absent one leaves it unchanged.
export const UpdateGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Enter a name").max(50).optional(),
  target: amountNumber(true).optional(),
  deadline: z.date().nullish(),
});

export type UpdateGoalSchemaType = {
  id: string;
  name?: string;
  target?: number;
  deadline?: Date | null;
};
