"use client";

import type { TransactionType } from "@/lib/types";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { writtenIssue } from "@/app/(dashboard)/_actions/plain-issue";
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
import { Field, FieldLabel } from "@/components/ui/field";
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
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";
import {
  CreateRecurringItemSchema,
  UpdateRecurringItemSchema,
  type CreateRecurringItemType,
} from "@/schemas/recurring";

import {
  CreateRecurringItem,
  UpdateRecurringItem,
} from "../_actions/recurring";
import CategoryPicker from "./CategoryPicker";

export type RecurringItemDraft = {
  id: string;
  name: string;
  amount: number;
  category: string;
  type: string;
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
  startDate: Date | null;
  endDate: Date | null;
  paused: boolean;
};

interface Props {
  trigger: React.ReactElement;
  item?: RecurringItemDraft;
  currency?: string | null;
}

function handleSaveError(error: Error) {
  toast.error(
    error instanceof Error && error.message
      ? error.message
      : "Unable to save the bill. Check the name, amount and category, then try again.",
    { id: "recurring-item" },
  );
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function toDateInputValue(date: Date | null) {
  return date ? format(date, "yyyy-MM-dd") : "";
}

function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

export default function RecurringItemDialog({
  trigger,
  item,
  currency,
}: Props) {
  const isEdit = Boolean(item);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const [name, setName] = useState(item?.name ?? "");
  const [amount, setAmount] = useState(item?.amount ?? 0);
  const [type, setType] = useState<TransactionType>(
    (item?.type as TransactionType) ?? "expense",
  );
  const [category, setCategory] = useState(item?.category ?? "");
  const [frequency, setFrequency] = useState<"weekly" | "monthly">(
    item?.frequency === "weekly" ? "weekly" : "monthly",
  );
  const [weekday, setWeekday] = useState(item?.weekday ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(item?.dayOfMonth ?? 1);
  const [startDate, setStartDate] = useState(
    toDateInputValue(item?.startDate ?? null),
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(item?.endDate ?? null),
  );

  const applyDraft = () => {
    setName(item?.name ?? "");
    setAmount(item?.amount ?? 0);
    setType((item?.type as TransactionType) ?? "expense");
    setCategory(item?.category ?? "");
    setFrequency(item?.frequency === "weekly" ? "weekly" : "monthly");
    setWeekday(item?.weekday ?? 1);
    setDayOfMonth(item?.dayOfMonth ?? 1);
    setStartDate(toDateInputValue(item?.startDate ?? null));
    setEndDate(toDateInputValue(item?.endDate ?? null));
  };

  const handleOpenChange = (next: boolean) => {
    if (next) {
      applyDraft();
    }
    setOpen(next);
  };

  const createMutation = useMutation({
    mutationFn: async (input: Parameters<typeof CreateRecurringItem>[0]) => {
      const res = await CreateRecurringItem(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: handleSaved,
    onError: handleSaveError,
  });
  const updateMutation = useMutation({
    mutationFn: async (input: Parameters<typeof UpdateRecurringItem>[0]) => {
      const res = await UpdateRecurringItem(input);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: handleSaved,
    onError: handleSaveError,
  });

  function handleSaved() {
    toast.success(isEdit ? "Bill updated" : "Bill added", {
      id: "recurring-item",
    });
    queryClient.invalidateQueries({ queryKey: ["recurringItems"] });
    setOpen(false);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const submit = () => {
    const shared = {
      name,
      amount,
      category,
      type,
      frequency,
      weekday: frequency === "weekly" ? weekday : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      startDate: fromDateInputValue(startDate),
      endDate: fromDateInputValue(endDate),
    } satisfies CreateRecurringItemType;

    if (isEdit) {
      const parsed = UpdateRecurringItemSchema.safeParse({
        ...shared,
        id: item?.id,
      });
      if (!parsed.success) {
        toast.error(
          writtenIssue(
            parsed.error.issues[0]?.message,
            "Unable to save the bill. Check the name, amount and category, then try again.",
          ),
          {
            id: "recurring-item",
          },
        );
        return;
      }
      updateMutation.mutate(parsed.data);
      return;
    }
    const parsed = CreateRecurringItemSchema.safeParse(shared);
    if (!parsed.success) {
      toast.error(
        writtenIssue(
          parsed.error.issues[0]?.message,
          "Unable to save the bill. Check the name, amount and category, then try again.",
        ),
        {
          id: "recurring-item",
        },
      );
      return;
    }
    createMutation.mutate(parsed.data);
  };

  const formatter = getFormatterForCurrency(currency ?? "USD");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit bill" : "Add a bill"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <Field>
            <FieldLabel htmlFor="recurring-name">Name</FieldLabel>
            <Input
              id="recurring-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Rent, internet, salary…"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="recurring-amount">Amount</FieldLabel>
            <NumericFormat
              id="recurring-amount"
              customInput={Input}
              thousandSeparator
              decimalScale={2}
              fixedDecimalScale
              allowNegative={false}
              value={amount}
              onValueChange={(values) => {
                setAmount(values.floatValue ?? 0);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {formatter.format(amount)} each time
            </p>
          </Field>

          <Field>
            <FieldLabel htmlFor="recurring-type">Type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => {
                if (value === "income" || value === "expense") {
                  setType(value);
                }
              }}
              items={{ income: "Income", expense: "Expense" }}
            >
              <SelectTrigger id="recurring-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="recurring-category">Category</FieldLabel>
            <CategoryPicker
              id="recurring-category"
              type={type}
              value={category || undefined}
              onChange={setCategory}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="recurring-frequency">Frequency</FieldLabel>
            <Select
              value={frequency}
              onValueChange={(value) => {
                if (value === "weekly" || value === "monthly") {
                  setFrequency(value);
                }
              }}
              items={{ weekly: "Weekly", monthly: "Monthly" }}
            >
              <SelectTrigger id="recurring-frequency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {frequency === "weekly" ? (
            <Field>
              <FieldLabel htmlFor="recurring-weekday">On</FieldLabel>
              <Select
                value={String(weekday)}
                onValueChange={(value) => {
                  if (value !== null) {
                    setWeekday(Number(value));
                  }
                }}
                items={Object.fromEntries(
                  WEEKDAYS.map((day, index) => [String(index), day]),
                )}
              >
                <SelectTrigger id="recurring-weekday" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((day, index) => (
                    <SelectItem key={day} value={String(index)}>
                      {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="recurring-day">On day</FieldLabel>
              <Select
                value={String(dayOfMonth)}
                onValueChange={(value) => {
                  if (value !== null) {
                    setDayOfMonth(Number(value));
                  }
                }}
                items={Object.fromEntries(
                  Array.from({ length: 31 }, (_, index) => [
                    String(index + 1),
                    `${index + 1}`,
                  ]),
                )}
              >
                <SelectTrigger id="recurring-day" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, index) => (
                    <SelectItem key={index + 1} value={String(index + 1)}>
                      {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="recurring-start">Starts</FieldLabel>
              <DateField
                id="recurring-start"
                value={startDate}
                onChange={setStartDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="recurring-end">Ends</FieldLabel>
              <DateField
                id="recurring-end"
                value={endDate}
                onChange={setEndDate}
              />
            </Field>
          </div>

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" className="w-full sm:w-auto" />}
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? (
                <Loader2 className="animate-spin" />
              ) : isEdit ? (
                "Save"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = value ? new Date(`${value}T00:00:00.000Z`) : undefined;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 font-normal",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon className="h-4 w-4" />
        {value ? format(selected as Date, "PPP") : "Optional"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "");
          }}
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onChange("")}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
