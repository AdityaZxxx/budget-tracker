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
import { TransactionType } from "@/lib/types";
import { Category } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ReactElement, ReactNode } from "react";
import { toast } from "sonner";
import { DeleteCategory } from "../_actions/categories";

interface Props {
  trigger: ReactNode;
  category: Category;
}

const DeleteCategoryDialog = ({ trigger, category }: Props) => {
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
    <AlertDialog>
      <AlertDialogTrigger render={trigger as ReactElement} />
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
