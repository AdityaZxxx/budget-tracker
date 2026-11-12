"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export function useSignOut() {
  const router = useRouter();

  return async () => {
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message || "Failed to sign out");
      return;
    }
    toast.success("Signed out");
    router.push("/sign-in");
    router.refresh();
  };
}
