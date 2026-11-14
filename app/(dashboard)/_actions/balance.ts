"use server";

import type { RecordSettlementSchemaType } from "@/schemas/settlement";

import { redirect } from "next/navigation";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
import { ok, fail } from "@/lib/action-result";
import { getMemberBalances, getSimplifiedTransfers } from "@/lib/balances";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import { withRequestId } from "@/lib/request-id";
import { recordSettlement } from "@/lib/settlements";
import { RecordSettlementSchema } from "@/schemas/settlement";

export async function getHouseholdBalances() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(
      await getMemberBalances(result.household.id, result.session.user.id),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to load the balances. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function getSimplifiedDebts() {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    return ok(await getSimplifiedTransfers(result.household.id));
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to simplify the debts. Refresh the page and try again.",
        ),
      );
    }
    throw cause;
  }
}

export async function RecordSettlement(form: RecordSettlementSchemaType) {
  const parsedBody = RecordSettlementSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      writtenIssue(
        parsedBody.error.issues[0]?.message,
        "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }
  const { session, household } = result;
  const { memberId, amount } = parsedBody.data;

  try {
    await withRequestId(async () => {
      await recordSettlement(
        household.id,
        session.user.id,
        { memberId, amount },
        result.membership.role,
      );
    });
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(
        writtenIssue(
          cause.message,
          "Unable to record the settlement. Select the member and enter a valid amount, then try again.",
        ),
      );
    }
    throw cause;
  }
  return ok();
}
