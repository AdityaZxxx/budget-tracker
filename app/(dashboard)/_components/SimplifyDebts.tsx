"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFormatterForCurrency } from "@/lib/helpers";

import { getSimplifiedDebts } from "../_actions/balance";

interface Props {
  currency: string | null;
}

const SimplifyDebts = ({ currency }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const debtsQuery = useQuery({
    queryKey: ["simplified-debts"],
    queryFn: getSimplifiedDebts,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const transfers = debtsQuery.data ?? [];

  return (
    <div className="container mt-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-xl">Simplify debts</CardTitle>
          <CardDescription>
            The fewest transfers that settle every balance. No money moves
            inside the app. Record what you paid as a Settlement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={debtsQuery.isLoading}>
            {transfers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                All settled up. No transfers needed.
              </p>
            ) : (
              <div className="space-y-2">
                {transfers.map((transfer) => (
                  <div
                    key={`${transfer.fromUserId}-${transfer.toUserId}`}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <span className="truncate">{transfer.fromName}</span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{transfer.toName}</span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatter.format(transfer.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SkeletonWrapper>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimplifyDebts;
