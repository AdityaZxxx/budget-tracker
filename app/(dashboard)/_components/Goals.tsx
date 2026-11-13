"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { MoreHorizontal, Pencil, Plus, TrashIcon } from "lucide-react";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { POLL_INTERVAL } from "@/lib/constants";
import { type GoalWithProgress } from "@/lib/goals";
import { getFormatterForCurrency } from "@/lib/helpers";

import { listGoals } from "../_actions/goals";
import CreateGoalDialog from "./CreateGoalDialog";
import DeleteGoalDialog from "./DeleteGoalDialog";
import EditGoalDialog from "./EditGoalDialog";

const Goals = ({
  currency,
  canEdit = true,
}: {
  currency: string | null;
  canEdit?: boolean;
}) => {
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const goalsQuery = useQuery({
    queryKey: ["goals"],
    queryFn: listGoals,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const goals = goalsQuery.data ?? [];

  return (
    <div className="container mt-12">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Goals</CardTitle>
              <CardDescription>
                Savings targets for this space. Add a contribution by tagging an
                expense transaction with a goal.
              </CardDescription>
            </div>
            {canEdit && (
              <CreateGoalDialog
                currency={currency}
                trigger={
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    New goal
                  </Button>
                }
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={goalsQuery.isLoading}>
            {goals.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No goals yet. Create one to start saving together.
              </p>
            ) : (
              <div className="space-y-2">
                {goals.map((goal) => {
                  const progress = Math.min(
                    (goal.contributed / goal.target) * 100,
                    100,
                  );
                  const reached = goal.contributed >= goal.target;
                  return (
                    <div
                      key={goal.id}
                      className="space-y-2 rounded-lg bg-muted/40 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                          <span className="truncate text-sm font-medium">
                            {goal.name}
                          </span>
                          {goal.deadline && (
                            <span className="text-xs text-muted-foreground">
                              by {format(new Date(goal.deadline), "PPP")}
                            </span>
                          )}
                        </span>
                        {canEdit && (
                          <GoalActions goal={goal} currency={currency} />
                        )}
                      </div>
                      <Progress
                        value={progress}
                        indicatorClassName={
                          reached ? "bg-income" : "bg-primary"
                        }
                        aria-label={`${goal.name} goal progress`}
                      />
                      <p className="text-xs text-muted-foreground tabular-nums">
                        <span className="font-medium text-foreground">
                          {Math.floor(progress)}%
                        </span>
                        {" · "}
                        {formatter.format(goal.contributed)} of{" "}
                        {formatter.format(goal.target)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
};

const GoalActions = ({
  goal,
  currency,
}: {
  goal: GoalWithProgress;
  currency: string | null;
}) => {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted"
                    aria-label={`Open actions for ${goal.name} goal`}
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
      <EditGoalDialog
        goal={goal}
        currency={currency}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteGoalDialog
        goal={goal}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
};

export default Goals;
