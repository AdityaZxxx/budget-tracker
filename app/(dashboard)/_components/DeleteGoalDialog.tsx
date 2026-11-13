"use client";

import type { ReactElement, ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import { type GoalWithProgress } from "@/lib/goals";

import { deleteGoal } from "../_actions/goals";

interface Props {
  trigger?: ReactNode;
  goal: GoalWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteGoalDialog = ({
  trigger,
  goal,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const goalIdentifier = `delete-goal-${goal.id}`;

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteGoal,
    onSuccess: async () => {
      toast.success("Goal deleted", {
        id: goalIdentifier,
      });
      await queryClient.invalidateQueries({
        queryKey: ["goals"],
      });
      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to delete goal. Try again.", {
        id: goalIdentifier,
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger render={trigger as ReactElement} /> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete goal &quot;{goal.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the &quot;{goal.name}&quot; goal. Its
            contribution transactions stay in your ledger. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Deleting goal…", { id: goalIdentifier });
              deleteMutation.mutate({ id: goal.id });
            }}
          >
            Delete goal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteGoalDialog;
