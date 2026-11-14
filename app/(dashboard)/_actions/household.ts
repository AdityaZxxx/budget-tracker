"use server";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import prisma from "@/lib/prisma";

export async function getHouseholdMemberCount() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(
      await prisma.householdMembership.count({
        where: {
          householdId: result.household.id,
        },
      }),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to load the household. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}
