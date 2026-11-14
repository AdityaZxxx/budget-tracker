"use client";

import type { Category } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CreateCategorySchema } from "@/schemas/categories";

import { UpdateCategory } from "../_actions/categories";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), { ssr: false });

interface Props {
  category: Category;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const EditCategoryDialog = ({
  category,
  trigger,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const queryClient = useQueryClient();
  const theme = useTheme();

  const { mutate, isPending } = useMutation({
    mutationFn: async (input: Parameters<typeof UpdateCategory>[0]) => {
      const res = await UpdateCategory(input);
      if (!res.ok) throw new Error(res.message);
      if (!res.data) {
        throw new Error(
          "Unable to update the category. Refresh the page and try again.",
        );
      }
      return res.data;
    },
    onSuccess: async (updated) => {
      toast.success(`Category "${updated.name}" updated`, {
        id: "update-category",
      });

      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["budgets"],
      });

      setOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to update the category. Refresh the page and try again.",
        {
          id: "update-category",
        },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      name: category.name,
      icon: category.icon,
      type: category.type as "income" | "expense",
    },
    validators: {
      onSubmit: CreateCategorySchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Updating category…", {
        id: "update-category",
      });
      mutate({
        originalName: category.name,
        name: value.name,
        icon: value.icon,
        type: value.type,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit{" "}
            <span
              className={cn(
                "m-1",
                category.type === "income"
                  ? "text-income-foreground"
                  : "text-expense-foreground",
              )}
            >
              {category.type}
            </span>
            category
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`edit-${field.name}`}>Name</FieldLabel>
                  <Input
                    id={`edit-${field.name}`}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid ? `${field.name}-error` : undefined
                    }
                    placeholder="Category name"
                    minLength={3}
                    maxLength={20}
                  />
                  <FieldDescription>
                    Transactions and budgets using this category are updated
                    too.
                  </FieldDescription>
                  {isInvalid && (
                    <FieldError
                      id={`${field.name}-error`}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>

          <form.Field name="icon">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={`edit-${field.name}`}>Icon</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id={`edit-${field.name}`}
                          aria-invalid={isInvalid}
                          aria-describedby={
                            isInvalid ? `${field.name}-error` : undefined
                          }
                          variant={"outline"}
                          className="h-[100px] w-full"
                        />
                      }
                    >
                      {field.state.value ? (
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl" aria-hidden="true">
                            {field.state.value}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Click to change
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <CircleOff className="h-[40px] w-[40px]" />
                          <p className="text-xs text-muted-foreground">
                            Click to select
                          </p>
                        </div>
                      )}
                    </PopoverTrigger>
                    <PopoverContent className="w-full">
                      <EmojiPicker
                        theme={theme.resolvedTheme}
                        onEmojiSelect={(emoji: { native: string }) => {
                          field.handleChange(emoji.native);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {isInvalid && (
                    <FieldError
                      id={`${field.name}-error`}
                      errors={field.state.meta.errors}
                    />
                  )}
                </Field>
              );
            }}
          </form.Field>
          <DialogFooter>
            <DialogClose
              render={<Button variant={"secondary"} type="button" />}
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {!isPending && "Save"}
              {isPending && <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCategoryDialog;
