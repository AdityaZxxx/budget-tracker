"use client";

import type { Period, Timeframe } from "@/lib/types";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  period: Period;
  setPeriod: (period: Period) => void;
  timeframe: Timeframe;
  setTimeframe: (timeframe: Timeframe) => void;
}

const HistoryPeriodSelector = ({
  period,
  setPeriod,
  timeframe,
  setTimeframe,
}: Props) => {
  const label =
    timeframe === "year"
      ? String(period.year)
      : new Date(period.year, period.month, 1).toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        });

  const shift = (delta: number) => {
    if (timeframe === "year") {
      setPeriod({ ...period, year: period.year + delta });
      return;
    }
    const next = new Date(period.year, period.month + delta, 1);
    setPeriod({ month: next.getMonth(), year: next.getFullYear() });
  };

  const prevLabel = timeframe === "year" ? "Previous year" : "Previous month";
  const nextLabel = timeframe === "year" ? "Next year" : "Next month";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
      <Tabs
        value={timeframe}
        onValueChange={(value) => setTimeframe(value as Timeframe)}
        className="flex w-full sm:w-auto"
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="year" className="flex-1 sm:flex-initial">
            Year
          </TabsTrigger>
          <TabsTrigger value="month" className="flex-1 sm:flex-initial">
            Month
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex w-full items-center justify-between gap-2 rounded-xl border bg-card p-1 sm:w-auto sm:justify-start">
        <Button
          variant="ghost"
          size="icon"
          aria-label={prevLabel}
          onClick={() => shift(-1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-36 text-center text-sm font-medium tabular-nums sm:text-base">
          {label}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={nextLabel}
          onClick={() => shift(1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default HistoryPeriodSelector;
