"use client";

import type { ReactNode } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface AuthSubmitButtonProps {
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}

const AuthSubmitButton = ({
  pending,
  pendingLabel,
  children,
}: AuthSubmitButtonProps) => {
  return (
    <Button
      type="submit"
      className="h-10 w-full gap-2 sm:h-9"
      disabled={pending}
    >
      {pending && (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
};

export default AuthSubmitButton;
