"use server";

import type { RevokeInviteLinkSchemaType } from "@/schemas/invite";
import type { InviteLink } from "@prisma/client";

import { redirect } from "next/navigation";

import { type ActionResult, fail, ok } from "@/lib/action-result";
import { DomainError } from "@/lib/errors";
import { requireHousehold } from "@/lib/household";
import {
  createInviteLink as createInviteLinkSeam,
  revokeInviteLink as revokeInviteLinkSeam,
} from "@/lib/invites";
import prisma from "@/lib/prisma";
import { RevokeInviteLinkSchema } from "@/schemas/invite";

import { firstIssueMessage } from "./parse-error";

export async function createInviteLink(): Promise<ActionResult<InviteLink>> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { session, household } = result;

  try {
    return ok(
      await createInviteLinkSeam(
        household.id,
        session.user.id,
        result.membership.role,
      ),
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }
}

export async function revokeInviteLink(
  form: RevokeInviteLinkSchemaType,
): Promise<ActionResult> {
  const parsedBody = RevokeInviteLinkSchema.safeParse(form);
  if (!parsedBody.success) {
    return fail(
      firstIssueMessage(
        parsedBody.error,
        "Unable to revoke the invite link. Try again.",
      ),
    );
  }

  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  try {
    await revokeInviteLinkSeam(
      result.household.id,
      parsedBody.data.id,
      result.membership.role,
    );
  } catch (cause) {
    if (cause instanceof DomainError) {
      return fail(cause.message);
    }
    throw cause;
  }

  return ok();
}

export async function listInviteLinks(): Promise<ActionResult<InviteLink[]>> {
  const result = await requireHousehold();
  if (!result) {
    redirect("/sign-in");
  }

  const { household } = result;

  return ok(
    await prisma.inviteLink.findMany({
      where: {
        householdId: household.id,
        revokedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  );
}
