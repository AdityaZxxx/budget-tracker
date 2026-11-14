"use client";

import { differenceInDays, startOfMonth } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { MAX_DATE_RANGE } from "@/lib/constants";

import TransactionTable from "./TransactionTable";

const TransactionsClient = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: startOfMonth(new Date()),
    to: new Date(),
  }));
  return (
    <div className="min-h-screen bg-background px-6">
      <header className="border-b bg-card py-8">
        <div className="container">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">
                Transactions
              </h1>
              <p className="text-muted-foreground">
                Search, filter, and export your income and expenses.
              </p>
            </div>

            <DateRangePicker
              initialDateFrom={dateRange.from}
              initialDateTo={dateRange.to}
              maxRangeDays={MAX_DATE_RANGE}
              onUpdate={(values) => {
                const { from, to } = values.range;
                if (!from || !to) return;
                if (differenceInDays(to, from) > MAX_DATE_RANGE) {
                  toast.error(
                    `The selected date range is too big. Choose a range of ${MAX_DATE_RANGE} days or less.`,
                  );
                  return;
                }
                setDateRange({ from, to });
              }}
            />
          </div>
        </div>
      </header>
      <div className="container py-8">
        <TransactionTable from={dateRange.from} to={dateRange.to} />
      </div>
    </div>
  );
};

export default TransactionsClient;
