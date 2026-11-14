import { z } from "zod";

import { freeText } from "@/schemas/text";

// The rules both surfaces that write a Category compose, so they cannot
// drift apart.
export const categoryNameSchema = freeText({
  min: 3,
  max: 20,
  minMessage: "Name the category in at least 3 characters",
});

// Lookup keys address rows exactly as stored, so a padded legacy name still
// resolves; the write path trims through categoryNameSchema.
export const categoryLookupNameSchema = z.string().min(1);
export const categoryIconSchema = freeText({
  min: 1,
  max: 20,
  minMessage: "Pick an icon",
});
export const categoryTypeSchema = z.enum(["income", "expense"]);

export const CreateCategorySchema = z.object({
  name: categoryNameSchema,
  icon: categoryIconSchema,
  type: categoryTypeSchema,
});

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  originalName: categoryLookupNameSchema,
  name: categoryNameSchema,
  icon: categoryIconSchema,
  type: categoryTypeSchema,
});

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;
