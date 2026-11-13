"use client";

import type { MonthlyRollup } from "@/lib/insights";

import * as echarts from "echarts";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";

interface Props {
  months: MonthlyRollup;
  formatter: { format: (value: number) => string };
}

type TooltipParam = {
  axisValue?: string | number;
  name?: string;
  seriesName?: string;
  value?: number | string | null;
  dataIndex?: number;
};

type TopLevelFormatterParams = TooltipParam | TooltipParam[];

const shortMonth = (month: number) =>
  new Date(Date.UTC(2024, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
  });

const fullMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

const readToken = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function InsightsTrendChart({ months, formatter }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const labels = months.map((bucket) => shortMonth(bucket.month));
    const income = readToken("--income");
    const expense = readToken("--expense");
    const muted = readToken("--muted-foreground");

    const tooltipFormatter = (raw: TopLevelFormatterParams) => {
      const items: TooltipParam[] = Array.isArray(raw) ? raw : [raw];
      const index = items[0]?.dataIndex;
      const bucket = index === undefined ? undefined : months[index];
      if (!bucket) return "";

      const net = bucket.income - bucket.expense;
      const netColor =
        net >= 0 ? "text-income-foreground" : "text-expense-foreground";
      const netSign = net >= 0 ? "+" : "";

      const rows = (
        [
          { key: "income", label: "Income", value: bucket.income },
          { key: "expense", label: "Expense", value: bucket.expense },
        ] as const
      )
        .map((row) => {
          const dot = `<span aria-hidden="true" class="h-2.5 w-2.5 shrink-0 rounded-[2px]" style="background:${row.key === "income" ? income : expense}"></span>`;
          return `
          <div class="flex w-full items-center gap-2">
            ${dot}
            <span class="flex flex-1 justify-between gap-4">
              <span class="text-muted-foreground">${row.label}</span>
              <span class="font-mono tabular-nums">${formatter.format(row.value)}</span>
            </span>
          </div>`.trim();
        })
        .join("");

      return `
        <div class="grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm">
          <div class="flex w-full items-center justify-between gap-4">
            <span class="font-medium">${fullMonth(bucket.year, bucket.month)}</span>
            <span class="font-mono tabular-nums ${netColor}">${netSign}${formatter.format(net)}</span>
          </div>
          <div class="grid gap-1.5">${rows}</div>
        </div>`.trim();
    };

    const chart = echarts.init(container, null, { renderer: "canvas" });
    chart.setOption({
      grid: {
        top: 12,
        right: 8,
        bottom: 8,
        left: isDesktop ? 56 : 8,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "transparent",
        padding: 0,
        borderWidth: 0,
        extraCssText: "box-shadow:none;",
        axisPointer: { type: "none" },
        formatter: tooltipFormatter as never,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: "transparent" } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: muted,
            opacity: 0.18,
            type: "dashed",
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: isDesktop
          ? {
              color: muted,
              fontSize: 11,
              formatter: (value: number) => formatter.format(value),
            }
          : { show: false },
      },
      series: [
        {
          name: "Income",
          type: "line",
          smooth: 0.35,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5 },
          itemStyle: { color: income },
          areaStyle: income ? { color: income, opacity: 0.16 } : undefined,
          emphasis: { focus: "series" },
          data: months.map((bucket) => bucket.income),
          animationDuration: shouldReduceMotion ? 0 : 1100,
          animationDelay: shouldReduceMotion ? 0 : 150,
        },
        {
          name: "Expense",
          type: "line",
          smooth: 0.35,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2.5 },
          itemStyle: { color: expense },
          areaStyle: expense ? { color: expense, opacity: 0.16 } : undefined,
          emphasis: { focus: "series" },
          data: months.map((bucket) => bucket.expense),
          animationDuration: shouldReduceMotion ? 0 : 1100,
          animationDelay: shouldReduceMotion ? 0 : 300,
        },
      ],
    });

    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, [months, formatter, shouldReduceMotion, isDesktop]);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div ref={mountRef} className="h-full min-h-0 w-full" />
    </div>
  );
}
