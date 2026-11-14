"use server";

import { redirect } from "next/navigation";

import { assertFullMember, requireHousehold } from "@/lib/household";
import {
  createRecurringItem,
  deleteRecurringItem,
  listRecurringItems,
  setRecurringItemPaused,
  updateRecurringItem,
} from "@/lib/recurring";
import {
  DeleteRecurringItemSchema,
  SetRecurringItemPausedSchema,
  type CreateRecurringItemType,
  type UpdateRecurringItemType,
} from "@/schemas/recurring";

export async function listRecurringItemsAction() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  return listRecurringItems(result.household.id);
}

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  await createRecurringItem(result.household.id, form);
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  await updateRecurringItem(result.household.id, form);
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  const parsedBody = SetRecurringItemPausedSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  await setRecurringItemPaused(
    result.household.id,
    parsedBody.data.id,
    parsedBody.data.paused,
  );
}

export async function DeleteRecurringItem(form: { id: string }) {
  const parsedBody = DeleteRecurringItemSchema.safeParse(form);
  if (!parsedBody.success) {
    throw new Error(parsedBody.error.message);
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  assertFullMember(result);

  await deleteRecurringItem(result.household.id, parsedBody.data.id);
}
