import { redirect } from "next/navigation";

import SignInForm from "@/components/auth/SignInForm";
import { getSession } from "@/lib/auth";

const SignInPage = async ({
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

  // Validating here rather than in proxy.ts is what keeps a stale session
  // cookie from bouncing between this page and the dashboard. The proxy can
  // only see that a cookie exists; this can see whether it still names a
  // session.
  if (await getSession()) {
    redirect(safeNext ?? "/");
  }

  return <SignInForm next={safeNext} />;
};

export default SignInPage;
