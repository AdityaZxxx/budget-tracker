"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { authClient } from "@/lib/auth-client";

import AuthCard from "./AuthCard";
import AuthField from "./AuthField";
import AuthSubmitButton from "./AuthSubmitButton";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      const { error } = await authClient.signIn.email({
        email: value.email,
        password: value.password,
      });
      setIsLoading(false);

      if (error) {
        toast.error(
          error.message ||
            "Unable to sign in. Check your credentials and try again.",
        );
        return;
      }

      toast.success("Signed in");
      router.push(next ?? "/");
      router.refresh();
    },
  });

  return (
    <AuthCard
      title="Sign in"
      description="Enter your email and password to access your account"
      next={next}
      alternate={{
        prompt: "Don't have an account?",
        label: "Sign up",
        href: "/sign-up",
      }}
    >
      <form
        method="post"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
        aria-busy={isLoading}
      >
        <form.Field name="email">
          {(field) => (
            <AuthField
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="you@example.com"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              isInvalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
              errors={field.state.meta.errors}
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <AuthField
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
              enterKeyHint="done"
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              isInvalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
              errors={field.state.meta.errors}
            />
          )}
        </form.Field>
        <AuthSubmitButton pending={isLoading} pendingLabel="Signing in…">
          Sign in
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
