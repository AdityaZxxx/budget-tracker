"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getFormatterForCurrency } from "@/lib/helpers";

import { listGoals } from "../_actions/goals";
import CreateGoalDialog from "./CreateGoalDialog";
import DeleteGoalDialog from "./DeleteGoalDialog";

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
    refetchInterval: 30_000,
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
                Savings targets for your household. Add a contribution by
                tagging an expense transaction with a goal.
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
                  return (
                    <div
                      key={goal.id}
                      className="space-y-2 rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{goal.name}</span>
                        <div className="flex items-center gap-2">
                          {goal.deadline && (
                            <span className="text-xs text-muted-foreground">
                              by {format(new Date(goal.deadline), "PPP")}
                            </span>
                          )}
                          {canEdit && (
                            <Tooltip>
                              <DeleteGoalDialog
                                goal={goal}
                                trigger={
                                  <TooltipTrigger
                                    render={
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      />
                                    }
                                  >
                                    <span className="sr-only">
                                      Delete goal {goal.name}
                                    </span>
                                    <Trash2 className="h-4 w-4" />
                                  </TooltipTrigger>
                                }
                              />
                              <TooltipContent>
                                Delete goal {goal.name}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <Progress value={progress} />
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatter.format(goal.contributed)} of{" "}
                        {formatter.format(goal.target)}
                        {goal.contributed >= goal.target && " — reached"}
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

export default Goals;
