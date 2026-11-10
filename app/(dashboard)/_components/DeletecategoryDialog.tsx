"use client";

import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
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

import { DeleteCategory } from "../_actions/categories";

interface Props {
  trigger?: ReactNode;
  category: Category;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DeleteCategoryDialog = ({
  trigger,
  category,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const categoryIdentifier = `${category.name}-${category.type}`;

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: DeleteCategory,
    onSuccess: async () => {
      toast.success("Category deleted", {
        id: categoryIdentifier,
      });
      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
    onError: () => {
      toast.error("Unable to delete category. Try again.", {
        id: categoryIdentifier,
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger ? <AlertDialogTrigger render={trigger as ReactElement} /> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete category &quot;{category.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the &quot;{category.name}&quot;{" "}
            {category.type} category. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Deleting category…", { id: categoryIdentifier });
              deleteMutation.mutate({
                name: category.name,
                type: category.type as TransactionType,
              });
            }}
          >
            Delete category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteCategoryDialog;
