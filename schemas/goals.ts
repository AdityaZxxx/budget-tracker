import { z } from "zod";

export const CreateGoalSchema = z.object({
  name: z.string().min(1, "Enter a name").max(50),
  target: z.coerce.number().positive().multipleOf(0.01),
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
