"use server";

import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { UpdateUserCurrencySchema } from "@/schemas/userSetting";
import { redirect } from "next/navigation";

export async function UpdateUserCurrency(currency: string) {
  const parsedBody = UpdateUserCurrencySchema.safeParse({
    currency,
  });
  if (!parsedBody.success) {
    throw parsedBody.error;
  }
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  const userSettings = await prisma.userSettings.update({
    where: {
      userId: session.user.id,
    },
    data: {
      currency,
    },
  });
  return userSettings;
}
