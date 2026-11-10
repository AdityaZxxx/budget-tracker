import type { TransactionType } from "@/lib/types";
import type { Category } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleOff, Loader2, PlusSquare } from "lucide-react";
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

import { CreateCategory } from "../_actions/categories";

const EmojiPicker = dynamic(() => import("./EmojiPicker"), { ssr: false });

interface Props {
  type: TransactionType;
  successCallback: (category: Category) => void;
  trigger?: ReactNode;
}

const CreateCategoryDialog = ({ type, successCallback, trigger }: Props) => {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();
  const theme = useTheme();

  const { mutate, isPending } = useMutation({
    mutationFn: CreateCategory,
    onSuccess: async (category: Category) => {
      form.reset();
      toast.success(`Category "${category.name}" created`, {
        id: "create-category",
      });

      successCallback(category);

      await queryClient.invalidateQueries({
        queryKey: ["categories"],
      });

      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to create category. Try again.", {
        id: "create-category",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      icon: "",
      type,
    },
    validators: {
      onSubmit: CreateCategorySchema,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Creating category…", {
        id: "create-category",
      });
      mutate(value);
    },
  });

  const triggerElement = (trigger ?? (
    <Button
      variant={"ghost"}
      className="flex border-separate items-center justify-start rounded-none border-b px-3 py-3 text-muted-foreground"
    >
      <PlusSquare className="mr-2 h-4 w-4" />
      Create new
    </Button>
  )) as ReactElement;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Create{" "}
            <span
              className={cn(
                "m-1",
                type === "income"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400",
              )}
            >
              {type}
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
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid ? `${field.name}-error` : undefined
                    }
                    placeholder="Category name"
                  />
                  <FieldDescription>
                    This is how your category will appear in the app.
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
                  <FieldLabel htmlFor={field.name}>Icon</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          id={field.name}
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
                          <span className="text-5xl" aria-hidden="true">
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
              render={
                <Button
                  variant={"secondary"}
                  type="button"
                  onClick={() => {
                    form.reset();
                  }}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {!isPending && "Create"}
              {isPending && <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCategoryDialog;
