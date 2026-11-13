"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useReducedMotion } from "motion/react";
import CountUp from "react-countup";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";

import { listBudgets } from "../_actions/budgets";
import BudgetDialog from "../manage/_components/BudgetDialog";

interface Props {
  currency: string | null;
}

const SafeToSpend = ({ currency }: Props) => {
  const shouldReduceMotion = useReducedMotion();
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: listBudgets,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const remaining = budgets.reduce(
    (sum, budget) => sum + Math.max(0, budget.remaining),
    0,
  );

  return (
    <div className="container mt-6">
      <Card className="flex w-full flex-col justify-center gap-1 p-6 transition-all hover:shadow-md">
        <SkeletonWrapper isLoading={isLoading}>
          {budgets.length === 0 ? (
            <div className="flex h-28 flex-col items-start justify-center gap-2">
              <div className="rounded-full bg-muted p-3">
                <Wallet
                  aria-hidden="true"
                  className="h-5 w-5 text-muted-foreground"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                No budgets yet. Create one to see what is safe to spend this
                month.
              </p>
              <BudgetDialog
                trigger={
                  <Button variant="outline" size="sm">
                    Create a budget
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-emerald-500/10 p-3">
                  <Wallet
                    aria-hidden="true"
                    className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Safe to spend
                  </p>
                  {shouldReduceMotion ? (
                    <span className="text-4xl font-bold tabular-nums">
                      {formatter.format(remaining)}
                    </span>
                  ) : (
                    <CountUp
                      end={remaining}
                      decimals={2}
                      duration={1.2}
                      formattingFn={(value: number) => formatter.format(value)}
                      preserveValue
                      className="text-4xl font-bold tabular-nums"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Left across your budgets this month
                  </p>
                </div>
              </div>
            </div>
          )}
        </SkeletonWrapper>
      </Card>
    </div>
  );
};

export default SafeToSpend;
