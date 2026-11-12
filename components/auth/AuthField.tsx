"use client";

import type { ComponentProps } from "react";

import { cn } from "cn";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FieldErrors = ComponentProps<typeof FieldError>["errors"];

interface AuthFieldProps extends Omit<
  ComponentProps<typeof Input>,
  | "aria-describedby"
  | "aria-invalid"
  | "className"
  | "id"
  | "name"
  | "onBlur"
  | "onChange"
  | "value"
> {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  isInvalid: boolean;
  errors: FieldErrors;
  className?: string;
}

const AuthField = ({
  name,
  label,
  value,
  onChange,
  onBlur,
  isInvalid,
  errors,
  className,
  ...inputProps
}: AuthFieldProps) => {
  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${name}-error` : undefined}
        className={cn("h-10 sm:h-9", className)}
        {...inputProps}
      />
      {isInvalid && <FieldError id={`${name}-error`} errors={errors} />}
    </Field>
  );
};

export default AuthField;
