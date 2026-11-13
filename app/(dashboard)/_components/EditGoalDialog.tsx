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

import { updateGoal } from "../_actions/goals";

interface Props {
  goal: GoalWithProgress;
  currency: string | null;
  trigger: ReactNode;
}

type EditGoalFormValues = {
  name: string;
  target: number;
  deadline: Date | undefined;
};

const EditGoalDialog = ({ goal, currency, trigger }: Props) => {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const currencyOption = Currencies.find((c) => c.value === currency);

  const numberParts = new Intl.NumberFormat(currencyOption?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const { mutate, isPending } = useMutation({
    mutationFn: updateGoal,
    onSuccess: async () => {
      toast.success("Goal updated", {
        id: "update-goal",
      });

      await queryClient.invalidateQueries({
        queryKey: ["goals"],
      });

      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to update goal. Try again.", {
        id: "update-goal",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: goal.name,
      target: goal.target,
      deadline: goal.deadline ? new Date(goal.deadline) : undefined,
    } as EditGoalFormValues,
    validators: {
      onSubmit: CreateGoalSchema as StandardSchemaV1<EditGoalFormValues>,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Saving goal…", {
        id: "update-goal",
      });

      // The form is the whole record, so an untouched deadline clears it.
      mutate({
        id: goal.id,
        name: value.name,
        target: value.target,
        deadline: value.deadline ?? null,
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit goal</DialogTitle>
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
              {!isPending ? "Save" : <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGoalDialog;
