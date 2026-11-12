import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

// `//host` is protocol-relative and leaves the origin, so the guard rejects it.
export const requireGuest = async (next?: string | string[]) => {
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  if (await getSession()) {
    redirect(safeNext ?? "/");
  }

  return safeNext;
};
