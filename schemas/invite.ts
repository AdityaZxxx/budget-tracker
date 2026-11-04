import { z } from "zod";

export const RevokeInviteLinkSchema = z.object({
  id: z.string().min(1),
});

export type RevokeInviteLinkSchemaType = z.infer<typeof RevokeInviteLinkSchema>;
