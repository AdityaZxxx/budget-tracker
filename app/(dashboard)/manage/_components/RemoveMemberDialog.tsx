"use client";

import type { ReactElement, ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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

import { type listMembers, removeMember } from "../_actions/membership";

type Member = Awaited<ReturnType<typeof listMembers>>[number];

interface Props {
  trigger: ReactNode;
  member: Member;
}

const RemoveMemberDialog = ({ trigger, member }: Props) => {
  const toastId = `remove-member-${member.userId}`;

  const queryClient = useQueryClient();
  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: async () => {
      toast.success(`${member.user.name} removed from the household`, {
        id: toastId,
      });
      await queryClient.invalidateQueries({
        queryKey: ["householdMembers"],
      });
    },
    onError: () => {
      toast.error("Unable to remove member. Try again.", {
        id: toastId,
      });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger as ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Remove {member.user.name} from the household?
          </AlertDialogTitle>
          <AlertDialogDescription>
            They will lose access to this household&apos;s transactions,
            categories, and invite links. Their past transactions stay in the
            ledger, attributed to them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Removing member…", { id: toastId });
              removeMutation.mutate({ userId: member.userId });
            }}
          >
            Remove member
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveMemberDialog;
