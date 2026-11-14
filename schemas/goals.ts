import { z } from "zod";

import { amountNumber } from "@/schemas/money";
import { freeText } from "@/schemas/text";

// The rules both surfaces that write a Goal compose, so they cannot drift
// apart; the web coerces form strings, the MCP tool keeps the JSON types.
// The deadline is not shared: the web parses a Date, the MCP tool takes a
// YYYY-MM-DD string.
export function goalFields(coerced: boolean) {
  return {
    name: freeText({ min: 1, max: 50, minMessage: "Enter a name" }),
    target: amountNumber(coerced),
  };
}

const fields = goalFields(true);

export const CreateGoalSchema = z.object({
  ...fields,
  deadline: z.date().optional(),
});

// The schema uses z.coerce, so its input type differs from the form values;
// the values are already typed correctly client-side.
export type CreateGoalSchemaType = {
  name: string;
  target: number;
  deadline?: Date;
};

// A `null` deadline clears it; an absent one leaves it unchanged. Dates are
// real Date objects by the time either caller parses (the client form and the
// MCP tool), so no coercion happens at this boundary.
export const UpdateGoalSchema = z.object({
  id: z.string().min(1),
  name: fields.name.optional(),
  target: fields.target.optional(),
  deadline: z.date().nullish(),
});

export type UpdateGoalSchemaType = z.infer<typeof UpdateGoalSchema>;
