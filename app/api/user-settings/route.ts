import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { requireHousehold } from "@/lib/household";

export async function GET() {
  const result = await requireHousehold();

  if (!result) {
    redirect("/sign-in");
  }

  revalidatePath("/");
  return NextResponse.json(result.household);
}
