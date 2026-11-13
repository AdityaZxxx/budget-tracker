"use client";

import type { TransactionType } from "@/lib/types";
import type { Household } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useStore, useForm, type StandardSchemaV1 } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/lib/auth-client";
import { POLL_INTERVAL } from "@/lib/constants";
import { Currencies } from "@/lib/currencies";
import { dateToUtcDate, getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import { CreateTransactionSchema } from "@/schemas/transaction";

import { listGoals } from "../_actions/goals";
import { getHouseholdMemberCount } from "../_actions/household";
import { CreateTransaction } from "../_actions/transaction";
import { listMembers } from "../manage/_actions/membership";
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

type SplitMode = "equal" | "amounts" | "percent";

type ShareDraft = { userId: string; amount: number };

type SplitMember = { user: { id: string } };

function parseAmountInput(raw: string | undefined) {
  const parsed = Number.parseFloat((raw ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function finalizeShares(
  mode: "amounts" | "percent",
  inputs: Record<string, string>,
  members: SplitMember[],
  amount: number,
): ShareDraft[] {
  const rounded = members.map((member) => {
    const raw = parseAmountInput(inputs[member.user.id]);
    return {
      userId: member.user.id,
      amount:
        Math.round((mode === "percent" ? (amount * raw) / 100 : raw) * 100) /
        100,
    };
  });

  const remainder =
    Math.round(
      (amount - rounded.reduce((sum, share) => sum + share.amount, 0)) * 100,
    ) / 100;
  if (remainder !== 0 && rounded.length > 0) {
    const largest = rounded.reduce((a, b) => (b.amount > a.amount ? b : a));
    largest.amount = Math.round((largest.amount + remainder) * 100) / 100;
  }

  return rounded.filter((share) => share.amount > 0);
}

const CreateTransactionDialog = ({ trigger, type }: Props) => {
  const [open, setOpen] = useState(false);
  // The default transaction date is today. It is read once per component
  // instance so rendering stays pure and the value cannot drift mid-edit.
  const [initialDate] = useState(() => new Date());

  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const currency = Currencies.find((c) => c.value === household.data?.currency);

  const numberParts = new Intl.NumberFormat(currency?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: listGoals,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const goals = goalsQuery.data ?? [];

  const memberCountQuery = useQuery({
    queryKey: ["memberCount"],
    queryFn: getHouseholdMemberCount,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
  const knownMemberCount = memberCountQuery.data;
  const showSharedToggle =
    knownMemberCount !== undefined && knownMemberCount > 1;

  const membersQuery = useQuery({
    queryKey: ["householdMembers"],
    queryFn: listMembers,
    enabled: knownMemberCount !== undefined && knownMemberCount > 1,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
  const members = membersQuery.data ?? [];

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: CreateTransaction,
    onSuccess: () => {
      toast.success("Transaction created", {
        id: "create-transaction",
      });
      form.reset();
      resetSplitInputs();

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
        },
      );
    },
  });

  const form = useForm({
    defaultValues: {
      description: "",
      category: "",
      amount: 0,
      type,
      date: initialDate,
      shared: true,
      goalId: "",
    },
    validators: {
      // The schema uses z.coerce, so its input type differs from the form
      // values; the values are already typed correctly client-side.
      onSubmit:
        CreateTransactionSchema as StandardSchemaV1<CreateTransactionFormValues>,
    },
    onSubmitInvalid: () => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    },
    onSubmit: ({ value }) => {
      toast.loading("Creating transaction…", {
        id: "create-transaction",
      });

      mutate({
        ...value,
        date: dateToUtcDate(value.date),
        shared:
          knownMemberCount !== undefined && knownMemberCount > 1
            ? value.shared
            : true,
        shares: buildShares(value),
      });
    },
  });

  const sharedValue = useStore(form.store, (state) => state.values.shared);
  const amountValue = useStore(form.store, (state) => state.values.amount);
  const formatter = getFormatterForCurrency(household.data?.currency ?? "USD");
  const { data: session } = useSession();

  const showSplitOptions =
    type === "expense" &&
    knownMemberCount !== undefined &&
    knownMemberCount > 1 &&
    sharedValue;

  const [splitMode, setSplitMode] = useState<SplitMode>("equal");
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({});
  const [splitPercents, setSplitPercents] = useState<Record<string, string>>(
    {},
  );

  const buildShares = (value: CreateTransactionFormValues) => {
    if (value.type !== "expense" || !value.shared || splitMode === "equal") {
      return undefined;
    }
    return finalizeShares(
      splitMode,
      splitMode === "percent" ? splitPercents : splitAmounts,
      members,
      value.amount,
    );
  };

  const previewShares =
    !showSplitOptions || splitMode === "equal"
      ? null
      : finalizeShares(
          splitMode,
          splitMode === "percent" ? splitPercents : splitAmounts,
          members,
          amountValue,
        );

  const splitInvalid =
    previewShares !== null &&
    Math.round(
      previewShares.reduce((sum, share) => sum + share.amount, 0) * 100,
    ) !== Math.round(amountValue * 100);

  const resetSplitInputs = () => {
    setSplitMode("equal");
    setSplitAmounts({});
    setSplitPercents({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Create a new{" "}
            <span
              className={cn(
                "m-1",
                type === "income"
                  ? "text-income-foreground"
                  : "text-expense-foreground",
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
          <form.Field name="description">
            {(field) => {
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
                    aria-describedby={
                      isInvalid ? `${field.name}-error` : undefined
                    }
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
          </form.Field>

          <form.Field name="amount">
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                  <SkeletonWrapper isLoading={household.isLoading}>
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
          </form.Field>

          <div className="flex flex-col gap-4">
            <form.Field name="category">
              {(field) => {
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
                      aria-describedby={
                        isInvalid ? `${field.name}-error` : undefined
                      }
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
            </form.Field>

            <form.Field name="date">
              {(field) => {
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
            </form.Field>
          </div>

          {type === "expense" && goals.length > 0 && (
            <form.Field name="goalId">
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>Goal (optional)</FieldLabel>
                  <Select
                    value={field.state.value || "none"}
                    onValueChange={(value) => {
                      if (value === null) return;
                      field.handleChange(value === "none" ? "" : value);
                    }}
                    items={{
                      none: "No goal",
                      ...Object.fromEntries(
                        goals.map((goal) => [goal.id, goal.name]),
                      ),
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
            </form.Field>
          )}

          {showSharedToggle && (
            <form.Field name="shared">
              {(field) => (
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
            </form.Field>
          )}

          {showSplitOptions && members.length > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Split</p>
                <Select
                  value={splitMode}
                  onValueChange={(value) => {
                    if (value === null) return;
                    setSplitMode(value as SplitMode);
                  }}
                  items={{
                    equal: "Equally",
                    amounts: "By amount",
                    percent: "By percent",
                  }}
                >
                  <SelectTrigger
                    className="w-44"
                    aria-label="How this expense is split"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equal">Equally</SelectItem>
                    <SelectItem value="amounts">By amount</SelectItem>
                    <SelectItem value="percent">By percent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {splitMode !== "equal" && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center gap-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {member.user.name}
                        {member.user.id === session?.user.id ? " (you)" : ""}
                      </span>
                      <NumericFormat
                        customInput={Input}
                        className="w-28"
                        value={
                          (splitMode === "percent"
                            ? splitPercents[member.user.id]
                            : splitAmounts[member.user.id]) ?? ""
                        }
                        onValueChange={(values) => {
                          const raw = values.value ?? "";
                          if (splitMode === "percent") {
                            setSplitPercents((prev) => ({
                              ...prev,
                              [member.user.id]: raw,
                            }));
                          } else {
                            setSplitAmounts((prev) => ({
                              ...prev,
                              [member.user.id]: raw,
                            }));
                          }
                        }}
                        thousandSeparator={thousandSeparator}
                        decimalSeparator={decimalSeparator}
                        decimalScale={splitMode === "percent" ? 1 : 2}
                        suffix={splitMode === "percent" ? "%" : undefined}
                        allowNegative={false}
                        aria-label={`Share for ${member.user.name}`}
                      />
                    </div>
                  ))}
                  <p
                    className={cn(
                      "text-xs",
                      splitInvalid
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    Assigned{" "}
                    {formatter.format(
                      previewShares?.reduce(
                        (sum, share) => sum + share.amount,
                        0,
                      ) ?? 0,
                    )}{" "}
                    of {formatter.format(amountValue)}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
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
              disabled={isPending || splitInvalid}
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
