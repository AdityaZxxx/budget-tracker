"use client";

import type { Household } from "@prisma/client";

import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Pencil, Target, TrashIcon } from "lucide-react";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import AddIconButton from "@/components/ui/add-icon-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmptyStateUI from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type BudgetWithProgress } from "@/lib/budgets";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

import { listBudgets } from "../../_actions/budgets";
import BudgetDialog from "./BudgetDialog";
import DeleteBudgetDialog from "./DeleteBudgetDialog";

const BudgetsSection = ({ canEdit }: { canEdit: boolean }) => {
  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const {
    data: budgets = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["budgets"],
    queryFn: listBudgets,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const format = household.data?.currency
    ? getFormatterForCurrency(household.data.currency).format
    : (value: number) => value.toFixed(2);

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Budgets</CardTitle>
              <CardDescription>
                Monthly spending limits per category
              </CardDescription>
            </div>
            {canEdit && (
              <BudgetDialog
                household={household.data}
                trigger={<AddIconButton label="Create budget" />}
              />
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          <SkeletonWrapper isLoading={isLoading}>
            {isError ? (
              <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
                <p className="mb-2 text-sm font-medium text-destructive">
                  Failed to load budgets
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : budgets.length === 0 ? (
              <EmptyStateUI
                icon={Target}
                hint="No budgets yet. Create one to track spending per category."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {budgets.map((budget) => (
                  <BudgetCard
                    key={budget.id}
                    budget={budget}
                    household={household.data}
                    format={format}
                    canEdit={canEdit}
                  />
                ))}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </section>
  );
};

export default BudgetsSection;

function BudgetCard({
  budget,
  household,
  format,
  canEdit,
}: {
  budget: BudgetWithProgress;
  household?: Household;
  format: (value: number) => string;
  canEdit: boolean;
}) {
  const overLimit = budget.percent >= 100;
  const nearLimit = budget.percent >= 80 && !overLimit;
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <div className="relative flex flex-col gap-2 rounded-lg border p-4 transition-all hover:shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{budget.category}</span>
            <Badge
              variant={budget.mode === "hard" ? "destructive" : "secondary"}
            >
              {budget.mode}
            </Badge>
          </div>
          {canEdit && (
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                          aria-label={`Open actions for ${budget.category} budget`}
                        />
                      }
                    />
                  }
                >
                  <span className="sr-only">Open actions</span>
                  <MoreHorizontal className="h-4 w-4" />
                </TooltipTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <TrashIcon className="h-4 w-4 text-muted-foreground" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent>Actions</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Progress
          value={Math.min(budget.percent, 100)}
          aria-label={`${budget.category} budget used`}
          indicatorClassName={cn(
            overLimit && "bg-expense",
            nearLimit && "bg-amber-500",
          )}
        />
        <p className="text-xs text-muted-foreground">
          {format(budget.spent)} of {format(budget.amount)} spent ·{" "}
          {format(Math.max(budget.remaining, 0))} remaining ·{" "}
          {Math.round(budget.percent)}%
        </p>
      </div>
      {canEdit && (
        <>
          <BudgetDialog
            budget={budget}
            household={household}
            open={editOpen}
            onOpenChange={setEditOpen}
          />
          <DeleteBudgetDialog
            budget={budget}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </>
  );
}
