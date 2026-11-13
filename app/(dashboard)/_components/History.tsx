"use client";

import type { HistoryChartRow, SeriesKey } from "./HistoryChart";
import type { Period, Timeframe } from "@/lib/types";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

import HistoryPeriodSelector from "./HistoryPeriodSelector";

const HistoryChart = dynamic(() => import("./HistoryChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full" />,
});

function HistoryLegend({
  hidden,
  onToggle,
}: {
  hidden: ReadonlySet<SeriesKey>;
  onToggle: (key: SeriesKey) => void;
}) {
  const items = [
    {
      key: "income" as const,
      label: "Income",
      swatch: "bg-emerald-600 dark:bg-emerald-500",
    },
    {
      key: "expense" as const,
      label: "Expense",
      swatch: "bg-red-600 dark:bg-red-500",
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map(({ key, label, swatch }) => {
        const isHidden = hidden.has(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            aria-pressed={!isHidden}
            aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-all duration-150 ease-out hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset",
              isHidden && "opacity-40",
            )}
          >
            <span
              aria-hidden="true"
              className={cn("h-3 w-3 shrink-0 rounded-[3px]", swatch)}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}

const History = ({ currency }: { currency: string | null }) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [hiddenSeries, setHiddenSeries] = useState<ReadonlySet<SeriesKey>>(
    () => new Set<SeriesKey>(),
  );
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
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
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
          <CardTitle className="grid grid-cols-1 justify-between gap-2 md:grid-flow-col md:items-center">
            <HistoryPeriodSelector
              period={period}
              setPeriod={setPeriod}
              timeframe={timeframe}
              setTimeframe={setTimeframe}
            />
            <div className="justify-self-start md:justify-self-end">
              <HistoryLegend
                hidden={hiddenSeries}
                onToggle={(key) =>
                  setHiddenSeries((prev) => {
                    const next = new Set(prev);
                    if (next.has(key)) {
                      next.delete(key);
                    } else {
                      next.add(key);
                    }
                    return next;
                  })
                }
              />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={historyDataQuery.isLoading}>
            {dataAvailable ? (
              <ScrollArea
                className="h-[312px] w-full md:h-[300px]"
                viewportClassName="w-full overscroll-x-contain pb-3 md:pb-0"
                orientation="horizontal"
              >
                <div className="h-full min-w-180 pb-3 md:min-w-0 md:pb-0">
                  <HistoryChart
                    data={historyDataQuery.data as HistoryChartRow[]}
                    timeframe={timeframe}
                    formatter={formatter}
                    hidden={hiddenSeries}
                  />
                </div>
              </ScrollArea>
            ) : (
              <Card className="flex h-[300px] flex-col items-center justify-center gap-1 bg-background text-center">
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
