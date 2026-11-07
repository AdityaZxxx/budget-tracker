"use client";

import { Household } from "@prisma/client";
import { useForm, type StandardSchemaV1 } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { ReactElement, ReactNode, useState } from "react";
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

import { createGoal } from "../_actions/goals";

interface Props {
  trigger: ReactNode;
  household: Household;
}

type CreateGoalFormValues = {
  name: string;
  target: number;
  deadline: Date | undefined;
};

const CreateGoalDialog = ({ trigger, household }: Props) => {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const currency = Currencies.find((c) => c.value === household.currency);

  const numberParts = new Intl.NumberFormat(currency?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const { mutate, isPending } = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      toast.success("Goal created", {
        id: "create-goal",
      });
      form.reset();

      queryClient.invalidateQueries({
        queryKey: ["goals"],
      });

      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to create goal. Try again.", {
        id: "create-goal",
      });
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      target: 0,
      deadline: undefined as Date | undefined,
    },
    validators: {
      onSubmit:
        CreateGoalSchema as unknown as StandardSchemaV1<CreateGoalFormValues>,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Creating goal…", {
        id: "create-goal",
      });

      mutate(value);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Create a new goal
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

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => form.reset()}
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
              {!isPending ? "Create" : <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGoalDialog;
