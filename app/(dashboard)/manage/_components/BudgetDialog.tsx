"use client";

import type { Household } from "@prisma/client";
import type { ReactElement, ReactNode } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { NumericFormat } from "react-number-format";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type BudgetWithProgress } from "@/lib/budgets";
import { Currencies } from "@/lib/currencies";
import { hasTwoDecimals } from "@/lib/helpers";

import { createBudget, updateBudget } from "../../_actions/budgets";
import CategoryPicker from "../../_components/CategoryPicker";

interface Props {
  trigger?: ReactNode;
  household?: Household;
  budget?: BudgetWithProgress;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const BudgetDialog = ({
  trigger,
  household,
  budget,
  open: openProp,
  onOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [category, setCategory] = useState(budget?.category ?? "");
  const [amount, setAmount] = useState(budget?.amount ?? 0);
  const [mode, setMode] = useState<"soft" | "hard">(
    budget?.mode === "hard" ? "hard" : "soft",
  );
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>(
    {},
  );

  const queryClient = useQueryClient();

  const isEditing = Boolean(budget);

  const currency = Currencies.find((c) => c.value === household?.currency);

  const numberParts = new Intl.NumberFormat(currency?.locale, {
    style: "decimal",
  }).formatToParts(1234.5);
  const thousandSeparator = numberParts.find((p) => p.type === "group")?.value;
  const decimalSeparator = numberParts.find((p) => p.type === "decimal")?.value;

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: {
      id?: string;
      category: string;
      amount: number;
      mode: "soft" | "hard";
    }) => {
      const res = values.id
        ? await updateBudget({
            id: values.id,
            category: values.category,
            amount: values.amount,
            mode: values.mode,
          })
        : await createBudget({
            category: values.category,
            amount: values.amount,
            mode: values.mode,
          });
      if (!res.ok) {
        throw new Error(res.message);
      }
      return res.data;
    },
    onSuccess: () => {
      toast.success(isEditing ? "Budget updated" : "Budget added", {
        id: "budget-dialog",
      });
      queryClient.invalidateQueries({
        queryKey: ["budgets"],
      });
      if (!isEditing) {
        setCategory("");
        setAmount(0);
        setMode("soft");
        setErrors({});
      }
      setOpen(false);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : `Unable to ${isEditing ? "update" : "create"} budget. Try again.`,
        {
          id: "budget-dialog",
        },
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: { category?: string; amount?: string } = {};
    if (!category) nextErrors.category = "Select a category";
    if (!amount || amount <= 0)
      nextErrors.amount = "Enter an amount greater than zero";
    else if (!hasTwoDecimals(amount))
      nextErrors.amount = "Enter an amount with at most two decimals";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    toast.loading(isEditing ? "Updating budget…" : "Adding budget…", {
      id: "budget-dialog",
    });

    mutate(
      isEditing && budget
        ? { id: budget.id, category, amount, mode }
        : { category, amount, mode },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger render={trigger as ReactElement} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-lg">
            {isEditing && budget
              ? `Edit ${budget.category} budget`
              : "Create a budget"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field data-invalid={Boolean(errors.category)}>
            <FieldLabel htmlFor="budget-category">Category</FieldLabel>
            <CategoryPicker
              key={open ? "open" : "closed"}
              id="budget-category"
              type="expense"
              value={category || undefined}
              onChange={setCategory}
              aria-invalid={Boolean(errors.category) || undefined}
              aria-describedby={
                errors.category ? "budget-category-error" : undefined
              }
            />
            <FieldDescription className="text-xs sm:text-sm">
              The monthly limit applies to expenses in this category
            </FieldDescription>
            {errors.category && (
              <FieldError id="budget-category-error">
                {errors.category}
              </FieldError>
            )}
          </Field>

          <Field data-invalid={Boolean(errors.amount)}>
            <FieldLabel htmlFor="budget-amount">Monthly limit</FieldLabel>
            <NumericFormat
              customInput={Input}
              id="budget-amount"
              placeholder="0.00"
              value={amount}
              onValueChange={(values) => {
                setAmount(values.floatValue ?? 0);
              }}
              thousandSeparator={thousandSeparator}
              decimalSeparator={decimalSeparator}
              decimalScale={2}
              allowNegative={false}
              inputMode="decimal"
              aria-invalid={amount > 0 && !hasTwoDecimals(amount)}
            />
            <FieldDescription className="text-xs sm:text-sm">
              Monthly limit for this category
            </FieldDescription>
            {errors.amount && (
              <FieldError id="budget-amount-error">{errors.amount}</FieldError>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="budget-mode">Mode</FieldLabel>
            <Select
              value={mode}
              onValueChange={(value) => {
                if (value === null) return;
                setMode(value as "soft" | "hard");
              }}
              items={{
                soft: "Soft (warn at 80% and 100%)",
                hard: "Hard (block expenses over the limit)",
              }}
            >
              <SelectTrigger id="budget-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">
                  Soft (warn at 80% and 100%)
                </SelectItem>
                <SelectItem value="hard">
                  Hard (block expenses over the limit)
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs sm:text-sm">
              Hard budgets reject shared expenses that would exceed the limit
            </FieldDescription>
          </Field>

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
              disabled={isPending || !category || !(amount > 0)}
              className="w-full sm:w-auto"
            >
              {!isPending ? (
                isEditing ? (
                  "Save"
                ) : (
                  "Create"
                )
              ) : (
                <Loader2 className="animate-spin" />
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BudgetDialog;
