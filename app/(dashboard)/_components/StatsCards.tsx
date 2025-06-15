"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card } from "@/components/ui/card";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { ReactNode, useMemo } from "react";
import CountUp from "react-countup";
import { type GetBalanceStatsResponseType } from "../../api/stats/balance/route";

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

const StatsCards = ({ from, to, userSettings }: Props) => {
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
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const { income = 0, expense = 0 } = statsQuery.data || {};
  const balance = income - expense;

  return (
    <div className="space-y-4">
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard
            formatter={formatter}
            value={income}
            title="Income"
            trend="up"
            isLoading={statsQuery.isFetching}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-emerald-400/10 p-3">
                <TrendingUp className="h-6 w-6 text-emerald-500" />
              </div>
            }
          />
          <StatCard
            formatter={formatter}
            value={expense}
            title="Expense"
            trend="down"
            isLoading={statsQuery.isFetching}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-rose-400/10 p-3">
                <TrendingDown className="h-6 w-6 text-rose-500" />
              </div>
            }
          />
          <StatCard
            formatter={formatter}
            value={balance}
            title="Balance"
            trend={balance >= 0 ? "up" : "down"}
            isLoading={statsQuery.isFetching}
            icon={
              <div className="flex items-center justify-center rounded-lg bg-violet-400/10 p-3">
                <Wallet className="h-6 w-6 text-violet-500" />
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
  formatter: Intl.NumberFormat;
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
  const trendColor = trend === "up" ? "text-emerald-500" : "text-rose-500";
  const trendBg = trend === "up" ? "bg-emerald-50" : "bg-rose-50";

  return (
    <Card className="flex h-full flex-col p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          <span className="text-sm font-medium text-gray-500">{title}</span>
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
          <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
        ) : (
          <CountUp
            preserveValue
            redraw={false}
            end={value}
            decimals={2}
            formattingFn={(value: number) => formatter.format(value)}
            className="text-2xl font-bold text-gray-900 dark:text-gray-100"
          />
        )}
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </div>
    </Card>
  );
}
