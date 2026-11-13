"use client";

import type { ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useState } from "react";
import CountUp from "react-countup";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { POLL_INTERVAL } from "@/lib/constants";
import { dateToUtcDate, getFormatterForCurrency } from "@/lib/helpers";
import { type GetBalanceStatsResponseType } from "@/lib/transactions";

interface Props {
  from: Date;
  to: Date;
  currency: string | null;
}

const StatsCards = ({ from, to, currency }: Props) => {
  const statsQuery = useQuery<GetBalanceStatsResponseType>({
    queryKey: ["overview", "stats", from, to],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/stats/balance?from=${dateToUtcDate(from)}&to=${dateToUtcDate(
            to,
          )}`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch balance stats");
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching stats:", error);
        throw error;
      }
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const formatter = getFormatterForCurrency(currency ?? "USD");

  const { income = 0, expense = 0 } = statsQuery.data || {};
  const balance = income - expense;

  return (
    <div className="space-y-4">
      <SkeletonWrapper isLoading={statsQuery.isLoading}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            formatter={formatter}
            value={income}
            title="Income"
            trend="up"
            isLoading={statsQuery.isLoading}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-income-soft p-3">
                <TrendingUp className="h-6 w-6 text-income-foreground" />
              </div>
            }
          />
          <StatCard
            formatter={formatter}
            value={expense}
            title="Expense"
            trend="down"
            isLoading={statsQuery.isLoading}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-expense-soft p-3">
                <TrendingDown className="h-6 w-6 text-expense-foreground" />
              </div>
            }
          />
          <StatCard
            formatter={formatter}
            value={balance}
            title="Balance"
            trend={balance >= 0 ? "up" : "down"}
            isLoading={statsQuery.isLoading}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-violet-500/10 p-3">
                <Wallet className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            }
          />
        </div>
      </SkeletonWrapper>
    </div>
  );
};

export default StatsCards;

interface StatCardProps {
  formatter: { format: (value: number) => string };
  value: number;
  title: string;
  icon: ReactNode;
  trend?: "up" | "down";
  isLoading?: boolean;
}

function StatCard({
  formatter,
  value,
  title,
  icon,
  trend,
  isLoading = false,
}: StatCardProps) {
  const trendColor =
    trend === "up" ? "text-income-foreground" : "text-expense-foreground";
  const trendBg = trend === "up" ? "bg-income-soft" : "bg-expense-soft";

  // The card footer shows today's date. It is read once per component
  // instance so rendering stays pure.
  const [today] = useState(() => new Date());

  return (
    <Card className="flex h-full flex-col p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium text-muted-foreground">
            {title}
          </span>
        </div>
        {trend && (
          <span
            className={`rounded-full px-2 py-1 text-xs ${trendBg} ${trendColor}`}
          >
            {trend === "up" ? "+" : "-"}
          </span>
        )}
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        ) : (
          <CountUp
            preserveValue
            redraw={false}
            end={value}
            decimals={2}
            formattingFn={(amount: number) => formatter.format(amount)}
            className="text-xl font-bold text-foreground tabular-nums"
          />
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {today.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </Card>
  );
}
