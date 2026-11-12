import type { Metadata } from "next";

import SignInForm from "@/components/auth/SignInForm";

import { requireGuest } from "../../_lib/require-guest";

export const metadata: Metadata = {
  title: "Sign in",
};

const SignInPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) => {
  const { next } = await searchParams;
  const safeNext = await requireGuest(next);

  return <SignInForm next={safeNext} />;
};

export default SignInPage;
