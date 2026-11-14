"use server";

import type {
  CreateGoalSchemaType,
  DeleteGoalSchemaType,
  UpdateGoalSchemaType,
} from "@/schemas/goals";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import {
  createHouseholdGoal,
  deleteHouseholdGoal,
  getGoalsWithProgress,
  updateHouseholdGoal,
} from "@/lib/goals";
import { requireHousehold } from "@/lib/household";
import {
  CreateGoalSchema,
  DeleteGoalSchema,
  UpdateGoalSchema,
} from "@/schemas/goals";

export async function listGoals() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(await getGoalsWithProgress(result.household.id));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to load the goals. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function createGoal(form: CreateGoalSchemaType) {
  const parsedBody = CreateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to create the goal. Check the name and target amount, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await createHouseholdGoal(
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
          "Unable to create the goal. Check the name and target amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function updateGoal(form: UpdateGoalSchemaType) {
  const parsedBody = UpdateGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to update the goal. Check the name and target amount, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await updateHouseholdGoal(
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
          "Unable to update the goal. Check the name and target amount, then try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function deleteGoal(form: DeleteGoalSchemaType) {
  const parsedBody = DeleteGoalSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to delete the goal. Check the goal and try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  try {
    return ok(
      await deleteHouseholdGoal(
        result.household.id,
        parsedBody.data.id,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to delete the goal. Check the goal and try again.",
        ),
      );
    }
    throw cause;
  }
}
