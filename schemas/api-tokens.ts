import { z } from "zod";

import { freeText } from "@/schemas/text";

export const CreateApiTokenSchema = z.object({
  name: freeText({ min: 1, minMessage: "Enter a name", max: 60 }),
  scope: z.enum(["read-only", "read-write"]),
  expiresAt: z.coerce
    .date()
    .refine((date) => date > new Date(), "Pick a future date")
    .optional(),
});

// The schema uses z.coerce, so its input type differs from the form values;
// the values are already typed correctly client-side.
export type CreateApiTokenSchemaType = {
  name: string;
  scope: "read-only" | "read-write";
  expiresAt?: Date;
};

export const RevokeApiTokenSchema = z.object({
  id: z.string().min(1),
});

export type RevokeApiTokenSchemaType = z.infer<typeof RevokeApiTokenSchema>;

export const SetAgentAccessSchema = z.object({
  enabled: z.boolean(),
});

export type SetAgentAccessSchemaType = z.infer<typeof SetAgentAccessSchema>;
