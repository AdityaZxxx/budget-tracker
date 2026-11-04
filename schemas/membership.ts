import { z } from "zod";

export const RemoveMemberSchema = z.object({
  userId: z.string().min(1),
});

export type RemoveMemberSchemaType = z.infer<typeof RemoveMemberSchema>;

export const SetEmailDigestSchema = z.object({
  emailDigest: z.boolean(),
});

export type SetEmailDigestSchemaType = z.infer<typeof SetEmailDigestSchema>;
