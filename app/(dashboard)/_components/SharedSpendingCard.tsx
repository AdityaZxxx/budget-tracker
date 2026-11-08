"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Users } from "lucide-react";
import { useMemo } from "react";
import CountUp from "react-countup";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

import { type GetSharedSpendingResponseType } from "../../api/stats/shared-spending/route";

interface Props {
  currency: string | null;
}

const SharedSpendingCard = ({ currency }: Props) => {
  const spendingQuery = useQuery<GetSharedSpendingResponseType>({
    queryKey: ["shared-spending"],
    queryFn: async () => {
      const response = await fetch("/api/stats/shared-spending");
      if (!response.ok) {
        throw new Error("Failed to fetch shared spending");
      }
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const formatter = useMemo(() => {
    return getFormatterForCurrency(currency ?? "USD");
  }, [currency]);

  const { thisMonth = 0, lastMonth = 0 } = spendingQuery.data ?? {};
  const difference = thisMonth - lastMonth;
  const isUp = difference >= 0;
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="container mt-12">
      <Card className="w-full p-6 transition-all hover:shadow-md">
        <SkeletonWrapper isLoading={spendingQuery.isLoading}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-lg bg-violet-500/10 p-3">
                <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Shared spending this month
                </p>
                <CountUp
                  preserveValue
                  redraw={false}
                  end={thisMonth}
                  decimals={2}
                  formattingFn={(amount: number) => formatter.format(amount)}
                  className="text-2xl font-bold text-foreground tabular-nums"
                />
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 text-sm",
                isUp
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-700 dark:text-emerald-400",
              )}
            >
              <TrendIcon className="h-4 w-4" />
              <span className="tabular-nums">
                {formatter.format(Math.abs(difference))}{" "}
                {isUp ? "more" : "less"} than last month (
                {formatter.format(lastMonth)})
              </span>
            </div>
          </div>
        </SkeletonWrapper>
      </Card>
    </div>
  );
};

export default SharedSpendingCard;
