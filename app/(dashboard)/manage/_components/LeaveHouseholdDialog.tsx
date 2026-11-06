"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ReactElement, ReactNode } from "react";
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
}

const LeaveHouseholdDialog = ({ trigger }: Props) => {
  const router = useRouter();

  const leaveMutation = useMutation({
    mutationFn: leaveHousehold,
    onSuccess: () => {
      toast.success("You left the household", { id: "leave-household" });
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to leave the household. Try again.", {
        id: "leave-household",
      });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger as ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave household?</AlertDialogTitle>
          <AlertDialogDescription>
            You will no longer see this household&apos;s transactions,
            categories, or invite links. Your past transactions stay in the
            ledger, attributed to you. You can join again later with a new
            invite link.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Leaving household…", { id: "leave-household" });
              leaveMutation.mutate();
            }}
          >
            Leave household
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LeaveHouseholdDialog;
