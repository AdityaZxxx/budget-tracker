"use client";

import type { GoalWithProgress } from "@/lib/goals";
import type { ReactElement, ReactNode } from "react";

import { useForm, type StandardSchemaV1 } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { Currencies } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { CreateGoalSchema } from "@/schemas/goals";

import { createGoal, updateGoal } from "../_actions/goals";

export type GoalFormValues = {
  name: string;
  target: number;
  deadline: Date | undefined;
};

const EMPTY_FORM: GoalFormValues = {
  name: "",
  target: 0,
  deadline: undefined,
};

const fromGoal = (goal: GoalWithProgress): GoalFormValues => ({
  name: goal.name,
  target: goal.target,
  deadline: goal.deadline ? new Date(goal.deadline) : undefined,
});

const COPY = {
  create: {
    title: "Create a new goal",
    submit: "Create",
    toastId: "create-goal",
    success: "Goal created",
    loading: "Creating goal…",
    error: "Unable to create goal. Try again.",
  },
  edit: {
    title: "Edit goal",
    submit: "Save",
    toastId: "update-goal",
    success: "Goal updated",
    loading: "Saving goal…",
    error: "Unable to update goal. Try again.",
  },
};

interface Props {
  trigger?: ReactNode;
  currency: string | null;
  goal?: GoalWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GoalFormDialog = ({
  trigger,
  currency,
  goal,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const copy = goal ? COPY.edit : COPY.create;

  const queryClient = useQueryClient();

  const currencyOption = Currencies.find((c) => c.value === currency);

  const numberParts = new Intl.NumberFormat(currencyOption?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const { mutate, isPending } = useMutation({
    mutationFn: (values: GoalFormValues) =>
      goal
        ? updateGoal({
            id: goal.id,
            name: values.name,
            target: values.target,
            deadline: values.deadline ?? null,
          })
        : createGoal(values),
    onSuccess: async () => {
      toast.success(copy.success, {
        id: copy.toastId,
      });

      await queryClient.invalidateQueries({
        queryKey: ["goals"],
      });

      if (!goal) {
        form.reset(EMPTY_FORM);
      }

      setOpen(false);
    },
    onError: () => {
      toast.error(copy.error, {
        id: copy.toastId,
      });
    },
  });

  const form = useForm({
    defaultValues: goal ? fromGoal(goal) : EMPTY_FORM,
    validators: {
      onSubmit: CreateGoalSchema as StandardSchemaV1<GoalFormValues>,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading(copy.loading, {
        id: copy.toastId,
      });

      // In edit mode the form is the whole record, so a deadline cleared in
      // the form (or never set) submits null and clears the stored one.
      mutate(value);
    },
  });

  // Every open starts from the current record, so a goal changed outside
  // this dialog (an MCP tool, another member) never shows stale values.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      form.reset(goal ? fromGoal(goal) : EMPTY_FORM);
    }
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{copy.title}</DialogTitle>
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
                    placeholder="e.g. Vacation, New car"
                  />
                  <FieldDescription className="text-xs sm:text-sm">
                    What are you saving for?
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

          <form.Field name="target">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Target amount</FieldLabel>
                  <NumericFormat
                    customInput={Input}
                    id={field.name}
                    name={field.name}
                    placeholder="0.00"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onValueChange={(values) => {
                      field.handleChange(values.floatValue ?? 0);
                    }}
                    thousandSeparator={thousandSeparator}
                    decimalSeparator={decimalSeparator}
                    decimalScale={2}
                    allowNegative={false}
                    aria-invalid={isInvalid}
                    aria-describedby={
                      isInvalid ? `${field.name}-error` : undefined
                    }
                  />
                  <FieldDescription className="text-xs sm:text-sm">
                    How much do you want to save?
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

          <form.Field name="deadline">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>
                    Deadline (optional)
                  </FieldLabel>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            id={field.name}
                            aria-invalid={isInvalid}
                            aria-describedby={
                              isInvalid ? `${field.name}-error` : undefined
                            }
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.state.value && "text-muted-foreground",
                            )}
                            variant={"outline"}
                          />
                        }
                      >
                        {field.state.value ? (
                          format(field.state.value, "PPP")
                        ) : (
                          <span>No deadline</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.state.value}
                          onSelect={(value) => {
                            field.handleChange(value);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {field.state.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => field.handleChange(undefined)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <FieldDescription className="text-xs sm:text-sm">
                    When do you want to reach the goal?
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

          <DialogFooter>
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => form.reset(goal ? fromGoal(goal) : EMPTY_FORM)}
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {!isPending ? copy.submit : <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalFormDialog;
