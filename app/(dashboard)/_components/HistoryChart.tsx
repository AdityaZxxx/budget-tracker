"use client";

import type { Timeframe } from "@/lib/types";

import {
  EChartsBarChart,
  type ChartConfig,
} from "@/components/evilcharts/charts/echarts-bar-chart";
import { useMediaQuery } from "@/hooks/use-media-query";

export type HistoryChartRow = {
  year: number;
  month: number;
  expense: number;
  income: number;
  day?: number;
};

export type SeriesKey = "income" | "expense";

interface Props {
  data: HistoryChartRow[];
  timeframe: Timeframe;
  formatter: { format: (value: number) => string };
  hidden: ReadonlySet<SeriesKey>;
}

type TooltipRow = {
  axisValue?: string | number;
  name?: string;
  seriesId?: string;
  seriesName?: string;
  value?: number | string | null;
};

type TopLevelFormatterParams = TooltipRow | TooltipRow[];

const chartConfig = {
  income: {
    label: "Income",
    colors: { light: ["var(--income)"], dark: ["var(--income)"] },
  },
  expense: {
    label: "Expense",
    colors: { light: ["var(--expense)"], dark: ["var(--expense)"] },
  },
} satisfies ChartConfig;

function bucketKey(row: HistoryChartRow, timeframe: Timeframe) {
  return String(timeframe === "year" ? row.month : (row.day ?? 0));
}

const monthShort = (monthIndex: number) =>
  new Date(2024, monthIndex, 1).toLocaleDateString(undefined, {
    month: "short",
  });

export default function HistoryChart({
  data,
  timeframe,
  formatter,
  hidden,
}: Props) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const rows = data.map((row) => ({
    ...row,
    key: bucketKey(row, timeframe),
  }));

  const tooltipFormatter = (params: TopLevelFormatterParams) => {
    const items: TooltipRow[] = Array.isArray(params) ? params : [params];
    const first = items.find((item) => item != null);
    const axisLabel = first?.axisValue ?? first?.name ?? "";
    const bucketIndex = Number.parseInt(String(axisLabel), 10);
    const row = rows.find(
      (entry) =>
        Number.parseInt(
          String(timeframe === "year" ? entry.month : (entry.day ?? -1)),
          10,
        ) === bucketIndex,
    );
    if (!row) return "";

    const net = row.income - row.expense;
    const netColor =
      net >= 0 ? "text-income-foreground" : "text-expense-foreground";
    const netSign = net >= 0 ? "+" : "";
    const header = new Date(
      row.year,
      row.month,
      row.day ?? 1,
    ).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const body = (["income", "expense"] as const)
      .flatMap((key) => {
        if (hidden.has(key)) return [];
        const value = key === "income" ? row.income : row.expense;
        const label = key === "income" ? "Income" : "Expense";
        const dot = `<span aria-hidden="true" class="h-2.5 w-2.5 shrink-0 rounded-[2px]" style="background:${SERIES_DOT_COLORS[key]}"></span>`;
        return [
          `
          <div class="flex w-full items-center gap-2">
            ${dot}
            <span class="flex flex-1 justify-between gap-4">
              <span class="text-muted-foreground">${label}</span>
              <span class="font-mono tabular-nums">${formatter.format(value)}</span>
            </span>
          </div>`.trim(),
        ];
      })
      .join("");

    return `
      <div class="grid min-w-36 items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl backdrop-blur-sm">
        <div class="flex w-full items-center justify-between gap-4">
          <span class="font-medium">${header}</span>
          <span class="font-mono tabular-nums ${netColor}">${netSign}${formatter.format(net)}</span>
        </div>
        <div class="grid gap-1.5">${body}</div>
      </div>`.trim();
  };

  return (
    <EChartsBarChart
      data={rows}
      config={chartConfig}
      barCategoryGap={8}
      barGap={1}
      className="h-full w-full"
      xDataKey="key"
      chartOptions={{
        tooltip: {
          trigger: "axis",
          confine: true,
          backgroundColor: "transparent",
          padding: 0,
          borderWidth: 0,
          extraCssText: "box-shadow:none;",
          axisPointer: { type: "none" },
          formatter: tooltipFormatter,
        },
      }}
    >
      <EChartsBarChart.Grid />
      <EChartsBarChart.XAxis
        dataKey="key"
        tickFormatter={(value: string) =>
          timeframe === "year" ? monthShort(Number.parseInt(value, 10)) : value
        }
      />
      {isDesktop && (
        <EChartsBarChart.YAxis
          tickFormatter={(value: string) => formatter.format(Number(value))}
        />
      )}
      {hidden.has("income") ? null : (
        <EChartsBarChart.Bar
          dataKey="income"
          variant="default"
          enableHoverHighlight
        />
      )}
      {hidden.has("expense") ? null : (
        <EChartsBarChart.Bar
          dataKey="expense"
          variant="default"
          enableHoverHighlight
        />
      )}
    </EChartsBarChart>
  );
}

const SERIES_DOT_COLORS: Record<SeriesKey, string> = {
  income: "var(--color-income-0)",
  expense: "var(--color-expense-0)",
};
