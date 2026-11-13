"use client";

import type { ReactElement, ReactNode } from "react";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { leaveHousehold } from "../_actions/membership";

interface Props {
  trigger: ReactNode;
  memberCount: number;
}

const LeaveHouseholdDialog = ({ trigger, memberCount }: Props) => {
  const router = useRouter();
  const isOnlyMember = memberCount === 1;

  const leaveMutation = useMutation({
    mutationFn: leaveHousehold,
    onSuccess: () => {
      toast.success(isOnlyMember ? "Space deleted" : "You left the household", {
        id: "leave-household",
      });
      router.refresh();
    },
    onError: () => {
      toast.error(
        isOnlyMember
          ? "Unable to delete the space. Try again."
          : "Unable to leave the household. Try again.",
        {
          id: "leave-household",
        },
      );
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger as ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isOnlyMember ? "Delete this space?" : "Leave household?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isOnlyMember
              ? "This permanently deletes your space and everything in it: transactions, categories, budgets, goals, and invite links. This cannot be undone."
              : "You will no longer see this household&apos;s transactions, categories, or invite links. Your past transactions stay in the ledger, attributed to you. You can join again later with a new invite link."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading(isOnlyMember ? "Deleting…" : "Leaving household…", {
                id: "leave-household",
              });
              leaveMutation.mutate();
            }}
          >
            {isOnlyMember ? "Delete this space" : "Leave household"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LeaveHouseholdDialog;
