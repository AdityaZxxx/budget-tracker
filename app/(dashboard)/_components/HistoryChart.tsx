"use client";

import type { ChartTooltipPayload } from "@/components/ui/chart";
import type { Timeframe } from "@/lib/types";

import CountUp from "react-countup";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";

export type HistoryChartRow = {
  year: number;
  month: number;
  expense: number;
  income: number;
  day?: number;
};

interface Props {
  data: HistoryChartRow[];
  timeframe: Timeframe;
  formatter: { format: (value: number) => string };
}

interface HistoryTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload<HistoryChartRow>;
  formatter: { format: (value: number) => string };
}

// Recharts and react-countup are close to half a megabyte together, and the
// chart sits below the fold, so it downloads only once the dashboard reaches
// it.
export default function HistoryChart({ data, timeframe, formatter }: Props) {
  return (
    <ResponsiveContainer width={"100%"} height={300}>
      <BarChart data={data} barCategoryGap={5}>
        <defs>
          <linearGradient id="incomeBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#059669" stopOpacity="1" />
            <stop offset="1" stopColor="#059669" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="expenseBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#dc2626" stopOpacity="1" />
            <stop offset="1" stopColor="#dc2626" stopOpacity="0.4" />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="5 5"
          strokeOpacity={"0.2"}
          vertical={false}
        />
        <XAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          padding={{ left: 5, right: 5 }}
          dataKey={(row: HistoryChartRow) => {
            const { year, month, day } = row;
            const date = new Date(year, month, day || 1);
            if (timeframe === "year") {
              return date.toLocaleDateString("default", {
                month: "long",
              });
            }
            return date.toLocaleDateString("default", {
              day: "2-digit",
            });
          }}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => formatter.format(value)}
        />
        <Tooltip
          cursor={{ opacity: 0.1 }}
          content={<CustomTooltip formatter={formatter} />}
        />
        <Bar
          dataKey={"income"}
          fill="url(#incomeBar)"
          radius={4}
          className="cursor-pointer"
        />
        <Bar
          dataKey={"expense"}
          fill="url(#expenseBar)"
          radius={4}
          className="cursor-pointer"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function CustomTooltip({ active, payload, formatter }: HistoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  if (!data) return null;
  const { expense, income } = data;
  return (
    <div className="w-[300px] max-w-[calc(100vw-2rem)] rounded-md border bg-background p-4">
      <TooltipRow
        formatter={formatter}
        label="Expense"
        value={expense}
        bgColor="bg-red-600 dark:bg-red-500"
        textColor="text-red-600 dark:text-red-400"
      />

      <TooltipRow
        formatter={formatter}
        label="Income"
        value={income}
        bgColor="bg-emerald-600 dark:bg-emerald-500"
        textColor="text-emerald-700 dark:text-emerald-400"
      />

      <TooltipRow
        formatter={formatter}
        label="Balance"
        value={income - expense}
        bgColor="bg-gray-500"
        textColor="text-foreground"
      />
    </div>
  );
}

function TooltipRow({
  label,
  value,
  bgColor,
  textColor,
  formatter,
}: {
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
  formatter: { format: (value: number) => string };
}) {
  const formattingFn = (amount: number) => {
    return formatter.format(amount);
  };
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-4 w-4 rounded-full", bgColor)} />
      <div className="flex w-full justify-between">
        <p className="text-sm font-bold">{label}</p>
        <div className={cn("text-sm font-bold tabular-nums", textColor)}>
          <CountUp
            duration={0.5}
            preserveValue
            end={value}
            decimals={0}
            className="text-sm tabular-nums"
            formattingFn={formattingFn}
          />
        </div>
      </div>
    </div>
  );
}
