import { z } from "zod";

// The rules both surfaces that write a Category compose, so they cannot
// drift apart.
export const categoryNameSchema = z
  .string()
  .trim()
  .min(3, "Name the category in at least 3 characters")
  .max(20);
export const categoryIconSchema = z
  .string()
  .trim()
  .min(1, "Pick an icon")
  .max(20);
export const categoryTypeSchema = z.enum(["income", "expense"]);

export const CreateCategorySchema = z.object({
  name: categoryNameSchema,
  icon: categoryIconSchema,
  type: categoryTypeSchema,
});

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export const DeleteCategorySchema = z.object({
  name: categoryNameSchema,
  type: categoryTypeSchema,
});

export type DeleteCategorySchemaType = z.infer<typeof DeleteCategorySchema>;

export const UpdateCategorySchema = z.object({
  originalName: categoryNameSchema,
  name: categoryNameSchema,
  icon: categoryIconSchema,
  type: categoryTypeSchema,
});

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;
