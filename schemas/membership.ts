import { z } from "zod";

export const RemoveMemberSchema = z.object({
  userId: z.string().min(1),
});

export type RemoveMemberSchemaType = z.infer<typeof RemoveMemberSchema>;

export const SetEmailDigestSchema = z.object({
  emailDigest: z.boolean(),
});

export type SetEmailDigestSchemaType = z.infer<typeof SetEmailDigestSchema>;

export const SetMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.union([z.literal("member"), z.literal("view_only")]),
});

export type SetMemberRoleSchemaType = z.infer<typeof SetMemberRoleSchema>;
