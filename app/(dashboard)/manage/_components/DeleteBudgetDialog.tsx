"use client";

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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactElement, ReactNode, useState } from "react";
import { toast } from "sonner";
import { deleteBudget, type BudgetWithProgress } from "../../_actions/budgets";

interface Props {
  trigger?: ReactNode;
  budget: BudgetWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteBudgetDialog = ({
  trigger,
  budget,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const budgetIdentifier = `delete-budget-${budget.id}`;

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
    onSuccess: async () => {
      toast.success("Budget deleted", {
        id: budgetIdentifier,
      });
      await queryClient.invalidateQueries({
        queryKey: ["budgets"],
      });
    },
    onError: () => {
      toast.error("Unable to delete budget. Try again.", {
        id: budgetIdentifier,
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger render={trigger as ReactElement} /> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete budget for &quot;{budget.category}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the monthly limit for &quot;
            {budget.category}&quot;. Transactions already recorded stay in the
            ledger. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Deleting budget…", { id: budgetIdentifier });
              deleteMutation.mutate({ id: budget.id });
            }}
          >
            Delete budget
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteBudgetDialog;
