"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateTransactionSchema } from "@/schemas/transaction";
import { ReactElement, ReactNode, useMemo, useState } from "react";
import { useForm, type StandardSchemaV1 } from "@tanstack/react-form";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Currencies } from "@/lib/currencies";
import { DateToUTCDate } from "@/lib/helpers";
import { Household } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import { CreateTransaction } from "../_actions/transaction";
import { listGoals } from "../_actions/goals";
import CategoryPicker from "./CategoryPicker";

interface Props {
  trigger: ReactNode;
  type: TransactionType;
}

type CreateTransactionFormValues = {
  description: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: Date;
  shared: boolean;
  goalId: string;
};

const CreateTransactionDialog = ({ trigger, type }: Props) => {
  const [open, setOpen] = useState(false);

  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const currency = Currencies.find(
    (c) => c.value === household.data?.currency
  );

  const { thousandSeparator, decimalSeparator } = useMemo(() => {
    const formatter = new Intl.NumberFormat(currency?.locale, {
      style: "decimal",
    });
    const parts = formatter.formatToParts(1234.5);
    const ts = parts.find((p) => p.type === "group")?.value;
    const ds = parts.find((p) => p.type === "decimal")?.value;
    return {
      thousandSeparator: ts,
      decimalSeparator: ds,
    };
  }, [currency]);

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: listGoals,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const goals = goalsQuery.data ?? [];

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: CreateTransaction,
    onSuccess: () => {
      toast.success("Transaction created", {
        id: "create-transaction",
      });
      form.reset();

      queryClient.invalidateQueries({
        queryKey: ["overview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["goals"],
      });

      setOpen(false);
    },
    onError: (error) => {
      // Server actions throw domain errors (e.g. a hard budget rejecting the
      // expense); surface the message when the runtime exposes it.
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to create transaction. Try again.",
        {
          id: "create-transaction",
        }
      );
    },
  });

  const form = useForm({
    defaultValues: {
      description: "",
      category: "",
      amount: 0,
      type,
      date: new Date(),
      shared: true,
      goalId: "",
    },
    validators: {
      // The schema uses z.coerce, so its input type differs from the form
      // values; the values are already typed correctly client-side.
      onSubmit: CreateTransactionSchema as unknown as StandardSchemaV1<CreateTransactionFormValues>,
    },
    onSubmitInvalid: () => {
      document
        .querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Creating transaction…", {
        id: "create-transaction",
      });

      mutate({
        ...value,
        date: DateToUTCDate(value.date),
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent className="max-h-[90vh] overscroll-contain overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Create a new{" "}
            <span
              className={cn(
                "m-1",
                type === "income"
                  ? "text-teal-700 dark:text-teal-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {type}
            </span>
            transaction
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="description"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                    placeholder="e.g. Groceries, Salary"
                  />
                  <FieldDescription className="text-xs sm:text-sm">
                    Transaction description (optional)
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
          />

          <form.Field
            name="amount"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                  <SkeletonWrapper isLoading={household.isFetching}>
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
                      aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                    />
                  </SkeletonWrapper>
                  <FieldDescription className="text-xs sm:text-sm">
                    Transaction amount (required)
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
          />

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <form.Field
              name="category"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
                    <FieldLabel htmlFor={field.name}>Category</FieldLabel>
                    <CategoryPicker
                      id={field.name}
                      type={type}
                      onChange={(value) => field.handleChange(value)}
                      aria-invalid={isInvalid}
                      aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                    />
                    <FieldDescription className="text-xs sm:text-sm">
                      Select a category
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
            />

            <form.Field
              name="date"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid} className="flex-1">
                    <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            id={field.name}
                            aria-invalid={isInvalid}
                            aria-describedby={isInvalid ? `${field.name}-error` : undefined}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.state.value && "text-muted-foreground"
                            )}
                            variant={"outline"}
                          />
                        }
                      >
                        {field.state.value ? (
                          format(field.state.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.state.value}
                          onSelect={(value) => {
                            if (!value) return;
                            field.handleChange(value);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FieldDescription className="text-xs sm:text-sm">
                      Transaction date
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
            />
          </div>

          {type === "expense" && goals.length > 0 && (
            <form.Field
              name="goalId"
              children={(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Goal (optional)</FieldLabel>
                  <Select
                    value={field.state.value || "none"}
                    onValueChange={(value) => {
                      if (value === null) return;
                      field.handleChange(value === "none" ? "" : value);
                    }}
                  >
                    <SelectTrigger id={field.name} className="w-full">
                      <SelectValue placeholder="No goal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No goal</SelectItem>
                      {goals.map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldDescription className="text-xs sm:text-sm">
                    Tag this expense as a contribution to a goal
                  </FieldDescription>
                </Field>
              )}
            />
          )}

          <form.Field
            name="shared"
            children={(field) => (
              <Field>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    name={field.name}
                    checked={field.state.value}
                    onBlur={field.handleBlur}
                    onCheckedChange={(checked) => field.handleChange(checked)}
                  />
                  <FieldLabel
                    htmlFor={field.name}
                    className="text-sm font-normal"
                  >
                    Shared with household
                  </FieldLabel>
                </div>
                <FieldDescription className="text-xs sm:text-sm">
                  Personal transactions are visible only to you and excluded
                  from household totals and budgets
                </FieldDescription>
              </Field>
            )}
          />

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

export default CreateTransactionDialog;
