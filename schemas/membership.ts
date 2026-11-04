import { z } from "zod";

export const RemoveMemberSchema = z.object({
  userId: z.string().min(1),
});

export type RemoveMemberSchemaType = z.infer<typeof RemoveMemberSchema>;
