"use server";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
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

  try {
    return ok(await listRecurringItems(result.household.id));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to load the bills. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function CreateRecurringItem(form: CreateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await createRecurringItem(
      result.household.id,
      form,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to add the bill. Check the name, amount and category, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function UpdateRecurringItem(form: UpdateRecurringItemType) {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await updateRecurringItem(
      result.household.id,
      form,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to update the bill. Check the name, amount and category, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function SetRecurringItemPaused(form: {
  id: string;
  paused: boolean;
}) {
  const parsedBody = SetRecurringItemPausedSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to update the bill. Check the bill and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await setRecurringItemPaused(
      result.household.id,
      parsedBody.data.id,
      parsedBody.data.paused,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to update the bill. Check the bill and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}

export async function DeleteRecurringItem(form: { id: string }) {
  const parsedBody = DeleteRecurringItemSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to delete the bill. Check the bill and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    await deleteRecurringItem(
      result.household.id,
      parsedBody.data.id,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to delete the bill. Check the bill and try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
