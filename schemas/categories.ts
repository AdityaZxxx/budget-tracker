import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(3).max(20),
  icon: z.string().max(20),
  type: z.enum(["income", "expense"]),
});

export type CreateCategorySchemaType = z.infer<typeof CreateCategorySchema>;

export const DeleteCategorySchema = z.object({
  name: z.string().min(3).max(20),
  type: z.enum(["income", "expense"]),
});

export type DeleteCategorySchemaType = z.infer<typeof DeleteCategorySchema>;

export const UpdateCategorySchema = z.object({
  originalName: z.string().min(3).max(20),
  name: z.string().min(3).max(20),
  icon: z.string().max(20),
  type: z.enum(["income", "expense"]),
});

export type UpdateCategorySchemaType = z.infer<typeof UpdateCategorySchema>;
