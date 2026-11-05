"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { Household } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ReactNode, useMemo } from "react";
import CountUp from "react-countup";
import { type GetBalanceStatsResponseType } from "../../api/stats/balance/route";

interface Props {
  from: Date;
  to: Date;
  household: Household;
}

const StatsCards = ({ from, to, household }: Props) => {
  const statsQuery = useQuery<GetBalanceStatsResponseType>({
    queryKey: ["overview", "stats", from, to],
    queryFn: async () => {
      try {
        const response = await fetch(
          `/api/stats/balance?from=${DateToUTCDate(from)}&to=${DateToUTCDate(
            to
          )}`
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
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(household.currency ?? "USD");
  }, [household.currency]);

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
              <div className="flex items-center justify-center rounded-lg bg-emerald-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
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
              <div className="flex items-center justify-center rounded-lg bg-rose-500/10 p-3">
                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
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
    trend === "up"
      ? "text-emerald-700 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  const trendBg =
    trend === "up"
      ? "bg-emerald-500/10 dark:bg-emerald-400/10"
      : "bg-rose-500/10 dark:bg-rose-400/10";

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
            formattingFn={(value: number) => formatter.format(value)}
            className="text-2xl font-bold tabular-nums text-foreground"
          />
        )}
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        {new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </Card>
  );
}
