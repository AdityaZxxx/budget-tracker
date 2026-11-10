import { redirect } from "next/navigation";

import SignUpForm from "@/components/auth/SignUpForm";
import { getSession } from "@/lib/auth";

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) => {
  const { next } = await searchParams;
  // Only same-origin absolute paths are honored so `next` cannot be an
  // open redirect to another host.
  const safeNext =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : undefined;

  // See the sign-in page: the cookie alone cannot tell a live session from a
  // stale one, and redirecting on it alone loops with the dashboard.
  if (await getSession()) {
    redirect(safeNext ?? "/");
  }

  return <SignUpForm next={safeNext} />;
};

export default SignUpPage;
