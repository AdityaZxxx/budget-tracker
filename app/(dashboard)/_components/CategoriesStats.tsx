"use client";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DateToUTCDate, GetFormatterForCurrency } from "@/lib/helpers";
import { TransactionType } from "@/lib/types";
import { UserSettings } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { type GetCategoriesStatsResponseType } from "../../api/stats/categories/route";

interface CategoriesCardProps {
  formatter: Intl.NumberFormat;
  type: TransactionType;
  data: GetCategoriesStatsResponseType;
  total: number;
}

interface Props {
  from: Date;
  to: Date;
  userSettings: UserSettings;
}

const CategoriesStats = ({ from, to, userSettings }: Props) => {
  const statsQuery = useQuery<GetCategoriesStatsResponseType>({
    queryKey: ["overview", "stats", "categories", from, to],
    queryFn: async () => {
      const response = await fetch(
        `/api/stats/categories?from=${DateToUTCDate(from)}&to=${DateToUTCDate(
          to
        )}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch categories stats");
      }
      return response.json();
    },
  });

  const formatter = useMemo(() => {
    return GetFormatterForCurrency(userSettings.currency);
  }, [userSettings.currency]);

  const { incomeStats, expenseStats } = useMemo(() => {
    const stats = statsQuery.data || [];
    const incomeData = stats.filter((d) => d.type === "income");
    const expenseData = stats.filter((d) => d.type === "expense");

    const totalIncome = incomeData.reduce(
      (sum, d) => sum + (d._sum.amount || 0),
      0
    );
    const totalExpense = expenseData.reduce(
      (sum, d) => sum + (d._sum.amount || 0),
      0
    );

    return {
      incomeStats: { data: incomeData, total: totalIncome },
      expenseStats: { data: expenseData, total: totalExpense },
    };
  }, [statsQuery.data]);

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <CategoriesCard
          formatter={formatter}
          type="income"
          data={incomeStats.data}
          total={incomeStats.total}
        />
      </SkeletonWrapper>
      <SkeletonWrapper isLoading={statsQuery.isFetching}>
        <CategoriesCard
          formatter={formatter}
          type="expense"
          data={expenseStats.data}
          total={expenseStats.total}
        />
      </SkeletonWrapper>
    </div>
  );
};

export default CategoriesStats;

function CategoriesCard({ data, type, formatter, total }: CategoriesCardProps) {
  return (
    <Card className="flex h-80 w-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-muted-foreground">
          {type === "income" ? "Incomes by category" : "Expenses by category"}
        </CardTitle>
      </CardHeader>
      <div className="flex-1 overflow-hidden">
        {data.length === 0 && (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <p className="text-center text-sm text-muted-foreground">
              No data for the selected period
            </p>
            <p className="text-center text-xs text-muted-foreground">
              Try selecting a different period or adding new {type}s.
            </p>
          </div>
        )}
        {data.length > 0 && (
          <ScrollArea className="h-full px-4">
            <div className="flex flex-col gap-4 p-1">
              {data.map((item) => {
                const amount = item._sum.amount || 0;
                const percentage = total > 0 ? (amount * 100) / total : 0;
                return (
                  <div key={item.category} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {item.categoryIcon} {item.category}
                      </span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {formatter.format(amount)}
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      indicatorClassName={
                        type === "income" ? "bg-emerald-500" : "bg-red-500"
                      }
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}
