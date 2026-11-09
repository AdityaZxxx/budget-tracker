import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { requireHousehold } from "@/lib/household";

// This route is read by four components that poll it, so it must not
// invalidate anything. Revalidating here turned every read into a render
// that triggered the next read, and the page reloaded in a loop. The writes
// that actually change the household revalidate on their own.
export async function GET() {
  const result = await requireHousehold();

  if (!result) {
    redirect("/sign-in");
  }

  return NextResponse.json(result.household);
}
