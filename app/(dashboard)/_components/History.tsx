"use client";

import type { HistoryChartRow } from "./HistoryChart";
import type { Period, Timeframe } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getFormatterForCurrency } from "@/lib/helpers";

import HistoryPeriodSelector from "./HistoryPeriodSelector";

const HistoryChart = dynamic(() => import("./HistoryChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />,
});

const History = ({ currency }: { currency: string | null }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [period, setPeriod] = useState<Period>(() => {
    const now = new Date();
    return {
      month: now.getMonth(),
      year: now.getFullYear(),
    };
  });

  const formatter = getFormatterForCurrency(currency ?? "USD");

  const historyDataQuery = useQuery({
    queryKey: ["overview", "history", timeframe, period],
    queryFn: async () => {
      const response = await fetch(
        `/api/history-data?timeframe=${timeframe}&year=${period.year}&month=${period.month}`,
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch history data: ${errorText}`);
      }
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const dataAvailable =
    historyDataQuery.data &&
    Array.isArray(historyDataQuery.data) &&
    historyDataQuery.data.length > 0;

  return (
    <div className="container">
      <h2 className="mt-12 text-3xl font-bold">History</h2>
      <Card className="col-span-12 mt-2 w-full">
        <CardHeader>
          <CardTitle className="grid grid-flow-row justify-between gap-2 md:grid-flow-col">
            <HistoryPeriodSelector
              period={period}
              setPeriod={setPeriod}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />
            <div className="flex h-10 gap-2">
              <Badge
                variant={"outline"}
                className="flex items-center gap-2 text-sm"
              >
                <div className="h-4 w-4 rounded-full bg-emerald-600 dark:bg-emerald-500"></div>
                Income
              </Badge>
              <Badge
                variant={"outline"}
                className="flex items-center gap-2 text-sm"
              >
                <div className="h-4 w-4 rounded-full bg-red-600 dark:bg-red-500"></div>
                Expense
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={historyDataQuery.isLoading}>
            {dataAvailable ? (
              <HistoryChart
                data={historyDataQuery.data as HistoryChartRow[]}
                timeframe={timeframe}
                formatter={formatter}
              />
            ) : (
              <Card className="flex h-[300px] flex-col items-center justify-center bg-background">
                No data for this period
                <p className="text-sm text-muted-foreground">
                  Try selecting a different period or adding new transactions.
                </p>
              </Card>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
};

export default History;
