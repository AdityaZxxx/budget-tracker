"use client";

import type { TransactionType } from "@/lib/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";

import {
  DeleteRecurringItem,
  listRecurringItemsAction,
  SetRecurringItemPaused,
} from "../_actions/recurring";
import CreateTransactionDialog from "./CreateTransactionDialog";
import RecurringItemDialog, {
  type RecurringItemDraft,
} from "./RecurringItemDialog";

interface Props {
  currency: string | null;
  canEdit: boolean;
}

const utc = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const dueLabel = (item: { isOverdue: boolean; dueDate: Date | null }) =>
  item.isOverdue && item.dueDate
    ? `Overdue since ${utc(item.dueDate)}`
    : "Due today";

const nextLabel = (item: {
  frequency: string;
  weekday: number | null;
  dayOfMonth: number | null;
}) => {
  if (item.frequency === "weekly") {
    const names = [
      "Sundays",
      "Mondays",
      "Tuesdays",
      "Wednesdays",
      "Thursdays",
      "Fridays",
      "Saturdays",
    ];
    return `Every ${names[item.weekday ?? 0]}`;
  }
  return `Day ${item.dayOfMonth} of the month`;
};

const UpcomingBills = ({ currency, canEdit }: Props) => {
  const queryClient = useQueryClient();
  const formatter = getFormatterForCurrency(currency ?? "USD");
  const [showAll, setShowAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RecurringItemDraft | null>(
    null,
  );

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["recurringItems"],
    queryFn: listRecurringItemsAction,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const pauseMutation = useMutation({
    mutationFn: SetRecurringItemPaused,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurringItems"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to update the bill. Try again.",
        { id: "pause-recurring-item" },
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: DeleteRecurringItem,
    onSuccess: () => {
      toast.success("Bill deleted", { id: "delete-recurring-item" });
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["recurringItems"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to delete the bill. Try again.",
        { id: "delete-recurring-item" },
      );
    },
  });

  const due = items.filter((item) => item.isDue);
  const visible = showAll ? items : due;
  const hiddenCount = items.length - due.length;

  return (
    <div className="container pt-6">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Upcoming bills</CardTitle>
              <CardDescription>
                Recurring income and expenses, due and past due
              </CardDescription>
            </div>
            {canEdit && (
              <RecurringItemDialog
                currency={currency}
                trigger={
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add bill
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={isLoading}>
            {items.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
                <div className="mb-2 rounded-full bg-muted p-3">
                  <CalendarClock className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Nothing here yet</p>
                <p className="text-sm text-muted-foreground">
                  {canEdit
                    ? "Add your first recurring bill or paycheck to get started."
                    : "No recurring bills have been added yet."}
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="flex h-24 flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing due right now.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {visible.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base"
                      >
                        {item.categoryIcon}
                      </span>
                      <span className="min-w-0">
                        <span className="block max-w-44 truncate text-sm font-medium sm:max-w-none">
                          {item.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {item.paused
                            ? "Paused"
                            : showAll && !item.isDue
                              ? nextLabel(item)
                              : dueLabel(item)}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                      <span
                        className={
                          item.type === "income"
                            ? "text-sm font-medium text-income-foreground tabular-nums"
                            : "text-sm font-medium text-expense-foreground tabular-nums"
                        }
                      >
                        {formatter.format(item.amount)}
                      </span>
                      {canEdit && (
                        <>
                          <CreateTransactionDialog
                            key={item.id}
                            type={item.type as TransactionType}
                            recurringItemId={item.id}
                            initialValues={{
                              description: item.name,
                              category: item.category,
                              amount: item.amount,
                              type: item.type as TransactionType,
                              shared: true,
                            }}
                            trigger={
                              <Button size="sm" variant="secondary">
                                Post
                              </Button>
                            }
                          />
                          <RecurringItemDialog
                            currency={currency}
                            item={item}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${item.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            }
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              item.paused
                                ? `Resume ${item.name}`
                                : `Pause ${item.name}`
                            }
                            onClick={() =>
                              pauseMutation.mutate({
                                id: item.id,
                                paused: !item.paused,
                              })
                            }
                          >
                            {item.paused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${item.name}`}
                            onClick={() => setDeleteTarget(item)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
        {items.length > due.length && (
          <CardFooter>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground"
              onClick={() => setShowAll((value) => !value)}
            >
              {showAll ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide {hiddenCount} not due
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Show all ({items.length})
                </>
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              The bill is removed from your list. Transactions already recorded
              stay in the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate({ id: deleteTarget.id });
                }
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UpcomingBills;
