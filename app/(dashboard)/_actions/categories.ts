"use server";

import type {
  CreateCategorySchemaType,
  DeleteCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

import { redirect } from "next/navigation";

import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";
import { requireHousehold } from "@/lib/household";
import {
  CreateCategorySchema,
  DeleteCategorySchema,
  UpdateCategorySchema,
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
  return await createHouseholdCategory(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
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
  return await updateHouseholdCategory(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
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
  return await deleteHouseholdCategory(
    result.household.id,
    parsedBody.data,
    result.membership.role,
  );
}
