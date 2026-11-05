"use client";

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
import { Currencies } from "@/lib/currencies";
import { Category, Household } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ReactElement, ReactNode, useMemo, useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";
import {
  createBudget,
  updateBudget,
  type BudgetWithProgress,
} from "../../_actions/budgets";

interface Props {
  trigger: ReactNode;
  household?: Household;
  budget?: BudgetWithProgress;
}

const BudgetDialog = ({ trigger, household, budget }: Props) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(budget?.category ?? "");
  const [amount, setAmount] = useState(budget?.amount ?? 0);
  const [mode, setMode] = useState<"soft" | "hard">(budget?.mode === "hard" ? "hard" : "soft");
  const [errors, setErrors] = useState<{ category?: string; amount?: string }>(
    {}
  );

  const queryClient = useQueryClient();

  const isEditing = Boolean(budget);

  const categoriesQuery = useQuery<Category[]>({
    queryKey: ["categories", "expense"],
    queryFn: () =>
      fetch(`/api/categories?type=expense`).then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch categories");
        }
        return res.json();
      }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const currency = Currencies.find((c) => c.value === household?.currency);

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

  const { mutate, isPending } = useMutation({
    mutationFn: (values: {
      id?: string;
      category: string;
      amount: number;
      mode: "soft" | "hard";
    }) =>
      values.id
        ? updateBudget({
            id: values.id,
            category: values.category,
            amount: values.amount,
            mode: values.mode,
          })
        : createBudget({
            category: values.category,
            amount: values.amount,
            mode: values.mode,
          }),
    onSuccess: () => {
      toast.success(isEditing ? "Budget updated" : "Budget created", {
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
        }
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: { category?: string; amount?: string } = {};
    if (!category) nextErrors.category = "Select a category";
    if (!amount || amount <= 0)
      nextErrors.amount = "Enter an amount greater than zero";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    toast.loading(isEditing ? "Updating budget…" : "Creating budget…", {
      id: "budget-dialog",
    });

    mutate(
      isEditing && budget
        ? { id: budget.id, category, amount, mode }
        : { category, amount, mode }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing && budget
              ? `Edit ${budget.category} budget`
              : "Create a budget"}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field data-invalid={Boolean(errors.category)}>
            <FieldLabel htmlFor="budget-category">Category</FieldLabel>
            <Select
              value={category || undefined}
              onValueChange={(value) => {
                if (value === null) return;
                setCategory(value);
              }}
            >
              <SelectTrigger id="budget-category" className="w-full">
                <SelectValue placeholder="Select an expense category" />
              </SelectTrigger>
              <SelectContent>
                {(categoriesQuery.data ?? []).map((expenseCategory) => (
                  <SelectItem
                    key={expenseCategory.name}
                    value={expenseCategory.name}
                  >
                    {expenseCategory.icon} {expenseCategory.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs sm:text-sm">
              The monthly limit applies to shared expenses in this category
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
            />
            <FieldDescription className="text-xs sm:text-sm">
              How much the household can spend in this category per month
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
            >
              <SelectTrigger id="budget-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="soft">
                  Soft — warn at 80% and 100%
                </SelectItem>
                <SelectItem value="hard">
                  Hard — block expenses over the limit
                </SelectItem>
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs sm:text-sm">
              Hard budgets reject shared expenses that would exceed the limit
            </FieldDescription>
          </Field>

          <DialogFooter className="gap-2 sm:gap-0">
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
              {!isPending ? (
                isEditing ? "Save" : "Create"
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
