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
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ReactElement, ReactNode } from "react";
import { toast } from "sonner";
import { deleteAccount } from "../_actions/account";

interface Props {
  trigger: ReactNode;
}

const DeleteAccountDialog = ({ trigger }: Props) => {
  const router = useRouter();

  const deleteMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      toast.success("Your account was deleted", { id: "delete-account" });
      router.replace("/sign-in");
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to delete your account. Try again.", {
        id: "delete-account",
      });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger as ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your sign-in and sessions. Every household
            where you are the last member is deleted with all of its data. In
            households with other members you are removed; transactions you
            added are deleted with your account, while transactions added by
            other members stay. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              toast.loading("Deleting account…", { id: "delete-account" });
              deleteMutation.mutate();
            }}
          >
            Delete account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;
