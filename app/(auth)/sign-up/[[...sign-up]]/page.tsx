import type { Metadata } from "next";

import SignUpForm from "@/components/auth/SignUpForm";

import { requireGuest } from "../../_lib/require-guest";

export const metadata: Metadata = {
  title: "Sign up",
};

const SignUpPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) => {
  const { next } = await searchParams;
  const safeNext = await requireGuest(next);

  return <SignUpForm next={safeNext} />;
};

export default SignUpPage;
