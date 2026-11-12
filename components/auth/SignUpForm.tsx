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

const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignUpForm({ next }: { next?: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: async ({ value }) => {
      setIsLoading(true);
      const { error } = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      });
      setIsLoading(false);

      if (error) {
        toast.error(
          error.message || "Unable to create your account. Try again.",
        );
        return;
      }

      toast.success("Account created");
      router.push(next ?? "/wizard");
      router.refresh();
    },
  });

  return (
    <AuthCard
      title="Sign up"
      description="Create an account to start tracking your budget"
      next={next}
      crossLink={{
        prompt: "Already have an account?",
        label: "Sign in",
        href: "/sign-in",
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
        <form.Field name="name">
          {(field) => (
            <AuthField
              name="name"
              label="Name"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              placeholder="Your name"
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
              autoComplete="new-password"
              enterKeyHint="done"
              placeholder="At least 8 characters"
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
        <AuthSubmitButton pending={isLoading} pendingLabel="Creating account…">
          Sign up
        </AuthSubmitButton>
      </form>
    </AuthCard>
  );
}
