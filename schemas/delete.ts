import { z } from "zod";

export const DeleteIdSchema = z.object({
  id: z.string().min(1, "Id is required"),
});

export type DeleteIdSchemaType = z.infer<typeof DeleteIdSchema>;
