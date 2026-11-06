"use server";

import { redirect } from "next/navigation";

import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";
import {
  CreateCategorySchema,
  CreateCategorySchemaType,
  DeleteCategorySchema,
  DeleteCategorySchemaType,
  UpdateCategorySchema,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

export async function CreateCategory(form: CreateCategorySchemaType) {
  const parsedBody = CreateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  const { name, icon, type } = parsedBody.data;
  return await prisma.category.create({
    data: {
      householdId: household.id,
      name,
      icon,
      type,
    },
  });
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  const parsedBody = UpdateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;
  const { originalName, name, icon, type } = parsedBody.data;

  if (originalName === SETTLEMENT_CATEGORY_NAME) {
    throw new Error("This category cannot be edited");
  }

  const existing = await prisma.category.findUnique({
    where: {
      name_householdId_type: {
        householdId: household.id,
        name: originalName,
        type,
      },
    },
  });

  if (!existing) {
    throw new Error("Category not found");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: {
        name_householdId_type: {
          householdId: household.id,
          name: originalName,
          type,
        },
      },
      data: { name, icon },
    });

    await tx.transaction.updateMany({
      where: {
        householdId: household.id,
        category: originalName,
        type,
      },
      data: {
        ...(name !== originalName && { category: name }),
        ...(icon !== existing.icon && { categoryIcon: icon }),
      },
    });

    if (type === "expense" && name !== originalName) {
      await tx.budget.updateMany({
        where: {
          householdId: household.id,
          category: originalName,
        },
        data: { category: name },
      });
    }

    return updated;
  });
}

export async function DeleteCategory(form: DeleteCategorySchemaType) {
  const parsedBody = DeleteCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error("Bad request");
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  return await prisma.category.delete({
    where: {
      name_householdId_type: {
        householdId: household.id,
        name: parsedBody.data.name,
        type: parsedBody.data.type,
      },
    },
  });
}
