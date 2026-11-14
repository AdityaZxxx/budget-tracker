import type {
  CreateCategorySchemaType,
  UpdateCategorySchemaType,
} from "@/schemas/categories";

import { SETTLEMENT_CATEGORY_NAME } from "@/lib/constants";
import { DomainError } from "@/lib/errors";
import prisma from "@/lib/prisma";
import { assertFullMemberRole, type MemberRole } from "@/lib/roles";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
} from "@/schemas/categories";

export async function getCategories(
  householdId: string,
  type?: "expense" | "income" | null,
) {
  return await prisma.category.findMany({
    where: {
      householdId,
      // The system Settlement category is hidden from pickers and lists.
      name: {
        not: SETTLEMENT_CATEGORY_NAME,
      },
      ...(type && { type }),
    },
    orderBy: {
      name: "asc",
    },
  });
}

export async function createHouseholdCategory(
  householdId: string,
  input: CreateCategorySchemaType,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = CreateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { name, icon, type } = parsed.data;

  assertNotSettlementCategory(name);

  return await prisma.category.create({
    data: {
      householdId,
      name,
      icon,
      type,
    },
  });
}

function assertNotSettlementCategory(name: string) {
  if (name === SETTLEMENT_CATEGORY_NAME) {
    throw new DomainError("Sora manages the Settlement category.");
  }
}

export async function updateHouseholdCategory(
  householdId: string,
  input: UpdateCategorySchemaType,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const parsed = UpdateCategorySchema.safeParse(input);
  if (!parsed.success) {
    throw new DomainError(
      parsed.error.issues[0]?.message ?? "Invalid category",
    );
  }

  const { originalName, name, icon, type } = parsed.data;

  assertNotSettlementCategory(originalName);
  if (name !== originalName) {
    assertNotSettlementCategory(name);
  }

  const existing = await prisma.category.findUnique({
    where: {
      name_householdId_type: {
        householdId,
        name: originalName,
        type,
      },
    },
  });

  if (!existing) {
    throw new DomainError("Category not found");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: {
        name_householdId_type: {
          householdId,
          name: originalName,
          type,
        },
      },
      data: { name, icon },
    });

    await tx.transaction.updateMany({
      where: {
        householdId,
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
          householdId,
          category: originalName,
        },
        data: { category: name },
      });
    }

    return updated;
  });
}

export async function deleteHouseholdCategory(
  householdId: string,
  id: string,
  role: MemberRole,
) {
  assertFullMemberRole(role);
  const category = await prisma.category.findFirst({
    where: {
      id,
      householdId,
    },
  });
  if (!category) {
    throw new DomainError("Category not found");
  }

  assertNotSettlementCategory(category.name);

  const deleted = await prisma.category.deleteMany({
    where: {
      id,
      householdId,
    },
  });
  if (deleted.count === 0) {
    throw new DomainError("Category not found");
  }

  return category;
}
