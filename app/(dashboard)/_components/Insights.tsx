"use client";

import type { GetInsightsResponseType } from "../../api/insights/route";

import { useQuery } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import CountUp from "react-countup";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";
import { cn } from "@/lib/utils";

const TrendChart = dynamic(() => import("./InsightsTrendChart"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

import CreateTransactionDialog from "./CreateTransactionDialog";

interface Props {
  currency: string | null;
}

const monthLong = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

const previousMonthLabel = (previous?: { year: number; month: number }) =>
  previous
    ? new Date(Date.UTC(previous.year, previous.month, 1)).toLocaleDateString(
        "en-US",
        { timeZone: "UTC", month: "long" },
      )
    : "last month";

const EMPTY_MONTHS: GetInsightsResponseType = [];

const rateFor = (bucket?: { income: number; expense: number }) =>
  bucket && bucket.income > 0
    ? (bucket.income - bucket.expense) / bucket.income
    : undefined;

const Insights = ({ currency }: Props) => {
  const shouldReduceMotion = useReducedMotion();
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const { data: queryMonths, isLoading } = useQuery<GetInsightsResponseType>({
    queryKey: ["insights"],
    queryFn: () => fetch("/api/insights").then((response) => response.json()),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const months = queryMonths ?? EMPTY_MONTHS;

  const hasAnyData = months.some(
    (bucket) => bucket.income > 0 || bucket.expense > 0,
  );

  if (!isLoading && !hasAnyData) {
    return (
      <div className="container mt-6">
        <Card className="flex h-40 w-full flex-col items-center justify-center gap-2 p-6 text-center">
          <div className="rounded-full bg-muted p-3">
            <HandCoins
              aria-hidden="true"
              className="h-5 w-5 text-muted-foreground"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Add your first transaction to see your savings rate.
          </p>
          <CreateTransactionDialog
            type="expense"
            trigger={
              <Button variant="outline" size="sm">
                Add a transaction
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const current = months.at(-1);
  const previous = months.at(-2);
  const currentRate = rateFor(current);
  const previousRate = rateFor(previous);
  const deltaPt =
    currentRate !== undefined && previousRate !== undefined
      ? Math.round((currentRate - previousRate) * 100)
      : undefined;

  const rateColor =
    currentRate === undefined || currentRate === 0
      ? "text-muted-foreground"
      : currentRate > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div className="container mt-6 grid gap-4 lg:grid-cols-3">
      <Card className="flex flex-col justify-center gap-1 p-6 transition-all hover:shadow-md">
        <p className="text-sm font-medium text-muted-foreground">
          Savings rate · {current ? monthLong(current.year, current.month) : ""}
        </p>
        <div
          aria-label={
            currentRate === undefined
              ? "Savings rate undefined: no income this month"
              : `Savings rate ${Math.round(currentRate * 100)} percent`
          }
        >
          {currentRate === undefined ? (
            <span
              aria-hidden="true"
              className="text-5xl font-bold text-muted-foreground"
            >
              –
            </span>
          ) : shouldReduceMotion ? (
            <span className={cn("text-5xl font-bold tabular-nums", rateColor)}>
              {Math.round(currentRate * 100)}%
            </span>
          ) : (
            <CountUp
              end={currentRate * 100}
              decimals={0}
              duration={1.2}
              suffix="%"
              preserveValue
              className={cn("text-5xl font-bold tabular-nums", rateColor)}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {deltaPt === undefined ? (
            <span className="tabular-nums">– pt</span>
          ) : (
            <span
              className={cn(
                "tabular-nums",
                deltaPt >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {deltaPt >= 0 ? "+" : "-"}
              {Math.abs(deltaPt)} pt
            </span>
          )}{" "}
          vs {previousMonthLabel(previous)}
        </p>
      </Card>

      <Card className="p-6 transition-all hover:shadow-md lg:col-span-2">
        <CardHeader className="p-0 pb-4">
          <CardTitle className="text-xl">Income vs expense</CardTitle>
          <p className="text-sm text-muted-foreground">Last six months</p>
        </CardHeader>
        <CardContent className="p-0">
          <SkeletonWrapper isLoading={isLoading}>
            <div className="h-44 w-full">
              <TrendChart months={months} formatter={formatter} />
            </div>
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
};

export default Insights;
