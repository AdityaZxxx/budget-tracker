"use client";

import { differenceInDays, startOfMonth } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { DateRangePicker } from "../../../components/ui/date-range-picker";
import { MAX_DATE_RANGE } from "../../../lib/constants";
import TransactionTable from "./_components/TransactionTable";

const transactionsPage = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  return (
    <>
      <div className="border-b bg-card px-6">
        <div className="container flex flex-wrap items-center justify-between gap-6 py-8">
          <div className="">
            <p className="text-3xl font-bold">Transactions history</p>
          </div>

          <DateRangePicker
            initialDateFrom={dateRange.from}
            initialDateTo={dateRange.to}
            showCompare={false}
            onUpdate={(values) => {
              const { from, to } = values.range;
              if (!from || !to) return;
              if (differenceInDays(to, from) > MAX_DATE_RANGE) {
                toast.error(
                  `The selected date range is too big. Max allowed range is ${MAX_DATE_RANGE} days!`
                );
              }
            }}
          />
        </div>
      </div>
      <div className="container px-6">
        <TransactionTable from={dateRange.from} to={dateRange.to} />
      </div>
    </>
  );
};

export default transactionsPage;
