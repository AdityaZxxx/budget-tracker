"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { CardContent } from "@/components/ui/card";
import { CardShell, CardShellHeader } from "@/components/ui/card-shell";
import EmptyState from "@/components/ui/empty-state";
import { POLL_INTERVAL } from "@/lib/constants";
import { getFormatterForCurrency } from "@/lib/helpers";

import { getSimplifiedDebts } from "../_actions/balance";

interface Props {
  currency: string | null;
}

const SimplifyDebts = ({ currency }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const debtsQuery = useQuery({
    queryKey: ["simplified-debts"],
    queryFn: async () => {
      const res = await getSimplifiedDebts();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const transfers = debtsQuery.data ?? [];

  return (
    <div className="container mt-6">
      <CardShell>
        <CardShellHeader
          title="Simplify debts"
          description="The fewest transfers that settle every balance. No money moves inside the app. Record what you paid as a Settlement."
        />
        <CardContent>
          <SkeletonWrapper isLoading={debtsQuery.isLoading}>
            {transfers.length === 0 ? (
              <CardContent>
                <EmptyState
                  icon={CheckCircle2}
                  hint="All settled up. No transfers needed right now."
                />
              </CardContent>
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
      </CardShell>
    </div>
  );
};

export default SimplifyDebts;
