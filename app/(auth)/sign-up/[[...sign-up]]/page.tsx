import SignUpForm from "@/components/auth/SignUpForm";

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
  return <SignUpForm next={safeNext} />;
};

export default SignUpPage;
