"use client";

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
    mutationFn: async (input: Parameters<typeof DeleteCategory>[0]) => {
      const res = await DeleteCategory(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: async () => {
      toast.success("Category deleted", {
        id: categoryIdentifier,
      });
      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to delete the category. Refresh the page and try again.",
        {
          id: categoryIdentifier,
        },
      );
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
              deleteMutation.mutate({ id: category.id });
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
