import { z } from "zod";

import { amountNumber, sharesArray } from "@/schemas/money";

// The rules both surfaces that write a Transaction compose, so they cannot
// drift apart; the web coerces form strings, the MCP tool keeps the JSON
// types, and the date stays with each surface.
export function transactionFields(coerced: boolean) {
  return {
    amount: amountNumber(coerced),
    description: z.string().optional(),
    category: z.string().min(1, "Select a category"),
    type: z.enum(["income", "expense"]),
    shared: z.boolean().default(true),
    // Empty string means no goal (the form's unset value).
    goalId: z.string().optional(),
    shares: sharesArray(coerced).optional(),
    // Set when the member is recording a due recurring item from the dashboard;
    // stamps that item's lastPostedAt after the transaction lands.
    recurringItemId: z.string().min(1).optional(),
  };
}

export const CreateTransactionSchema = z.object({
  ...transactionFields(true),
  date: z.date(),
});

export type CreateTransactionSchemaType = {
  amount: number;
  description?: string;
  date: Date;
  category: string;
  type: "income" | "expense";
  shared: boolean;
  goalId?: string;
  shares?: { userId: string; amount: number }[];
  recurringItemId?: string;
};
export type CreateTransactionSchemaOutput = z.output<
  typeof CreateTransactionSchema
>;
