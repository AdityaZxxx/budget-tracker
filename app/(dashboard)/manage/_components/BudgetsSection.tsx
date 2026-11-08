"use client";

import { Household } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  MoreHorizontal,
  Pencil,
  PlusSquare,
  Target,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

import { listBudgets, type BudgetWithProgress } from "../../_actions/budgets";
import BudgetDialog from "./BudgetDialog";
import DeleteBudgetDialog from "./DeleteBudgetDialog";

const BudgetsSection = ({ canEdit }: { canEdit: boolean }) => {
  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    refetchInterval: 30_000,
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
    refetchInterval: 30_000,
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
              <CardTitle className="text-xl">Budgets</CardTitle>
              <CardDescription>
                Monthly spending limits per category for shared expenses
              </CardDescription>
            </div>
            {canEdit && (
              <Tooltip>
                <BudgetDialog
                  household={household.data}
                  trigger={
                    <TooltipTrigger
                      render={
                        <Button
                          size="sm"
                          className="gap-2"
                          aria-label="Create budget"
                        />
                      }
                    >
                      <PlusSquare className="h-4 w-4" />
                      <span className="sr-only md:not-sr-only">Create</span>
                    </TooltipTrigger>
                  }
                />
                <TooltipContent>Create budget</TooltipContent>
              </Tooltip>
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
              <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center">
                <div className="mb-2 rounded-full bg-muted p-3">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No budgets yet</p>
                <p className="text-sm text-muted-foreground">
                  Create one to track spending per category
                </p>
              </div>
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
      <div className="group relative flex flex-col gap-2 rounded-lg border p-4 transition-all hover:shadow-md">
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
                          className="h-8 w-8 p-0 text-muted-foreground opacity-100 hover:bg-muted md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100"
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
          indicatorClassName={cn(
            overLimit && "bg-rose-500",
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
