"use server";

import type {
  CreateCategorySchemaType,
  DeleteCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import {
  createHouseholdCategory,
  deleteHouseholdCategory,
  updateHouseholdCategory,
} from "@/lib/categories";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import {
  CreateCategorySchema,
  DeleteCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";

export async function CreateCategory(form: CreateCategorySchemaType) {
  const parsedBody = CreateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to create the category. Check the name and icon, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdCategory(
        result.household.id,
        parsedBody.data,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to create the category. Check the name and icon, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function UpdateCategory(form: UpdateCategorySchemaType) {
  const parsedBody = UpdateCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to update the category. Check the name and icon, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdCategory(
        result.household.id,
        parsedBody.data,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to update the category. Check the name and icon, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function DeleteCategory(form: DeleteCategorySchemaType) {
  const parsedBody = DeleteCategorySchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to delete the category. Check the category and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdCategory(
        result.household.id,
        parsedBody.data,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to delete the category. Check the category and try again.",
        ),
      );
    }
    throw cause;
  }
}
