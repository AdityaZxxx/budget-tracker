"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { useReducedMotion } from "motion/react";
import CountUp from "react-countup";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CardShell, CardShellHeader } from "@/components/ui/card-shell";
import EmptyState from "@/components/ui/empty-state";
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
      <CardShell>
        <CardShellHeader
          title="Safe to spend"
          description="Left across your budgets this month"
          action={
            budgets.length === 0 ? (
              <BudgetDialog
                trigger={
                  <Button variant="outline" size="sm">
                    Create a budget
                  </Button>
                }
              />
            ) : undefined
          }
        />
        <SkeletonWrapper isLoading={isLoading}>
          {budgets.length === 0 ? (
            <CardContent>
              <EmptyState
                icon={Wallet}
                hint="Set your first budget and this figure tells you what is safe to spend."
              />
            </CardContent>
          ) : (
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-emerald-500/10 p-3">
                    <Wallet
                      aria-hidden="true"
                      className="h-6 w-6 text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                  <div>
                    {shouldReduceMotion ? (
                      <span className="text-4xl font-bold tabular-nums">
                        {formatter.format(remaining)}
                      </span>
                    ) : (
                      <CountUp
                        end={remaining}
                        decimals={2}
                        duration={1.2}
                        formattingFn={(value: number) =>
                          formatter.format(value)
                        }
                        preserveValue
                        className="text-4xl font-bold tabular-nums"
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </SkeletonWrapper>
      </CardShell>
    </div>
  );
};

export default SafeToSpend;
