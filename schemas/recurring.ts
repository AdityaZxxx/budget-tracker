import { z } from "zod";

import { amountNumber } from "@/schemas/money";

export const RecurringItemFrequency = z.union([
  z.literal("weekly"),
  z.literal("monthly"),
]);

const recurringItemFields = z.object({
  name: z.string().trim().min(1, "Name the bill").max(60),
  amount: amountNumber(true),
  category: z.string().min(1, "Select a category"),
  type: z.union([z.literal("income"), z.literal("expense")]),
  frequency: RecurringItemFrequency,
  weekday: z.coerce.number().int().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

type RecurringItemFields = z.input<typeof recurringItemFields>;

function frequencyRules(value: RecurringItemFields, ctx: z.RefinementCtx) {
  if (value.frequency === "weekly" && value.weekday === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Pick the weekday for a weekly bill",
      path: ["weekday"],
    });
  }
  if (value.frequency === "monthly" && value.dayOfMonth === undefined) {
    ctx.addIssue({
      code: "custom",
      message: "Pick the day of the month for a monthly bill",
      path: ["dayOfMonth"],
    });
  }
  if (value.startDate && value.endDate && value.endDate < value.startDate) {
    ctx.addIssue({
      code: "custom",
      message: "The end date is before the start date",
      path: ["endDate"],
    });
  }
}

export const CreateRecurringItemSchema =
  recurringItemFields.superRefine(frequencyRules);

export const UpdateRecurringItemSchema = recurringItemFields
  .extend({
    id: z.string().min(1),
    paused: z.boolean().optional(),
  })
  .superRefine(frequencyRules);

export const SetRecurringItemPausedSchema = z.object({
  id: z.string().min(1),
  paused: z.boolean(),
});

export const DeleteRecurringItemSchema = z.object({
  id: z.string().min(1),
});

export type CreateRecurringItemType = z.input<typeof CreateRecurringItemSchema>;
export type UpdateRecurringItemType = z.input<typeof UpdateRecurringItemSchema>;
