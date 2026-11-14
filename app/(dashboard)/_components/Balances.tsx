"use client";

import { useQuery } from "@tanstack/react-query";
import { Handshake, Users } from "lucide-react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { CardShell, CardShellHeader } from "@/components/ui/card-shell";
import EmptyState from "@/components/ui/empty-state";
import { POLL_INTERVAL } from "@/lib/constants";
import { fetchJson } from "@/lib/fetch-json";
import { getFormatterForCurrency } from "@/lib/helpers";
import { MemberBalancesSchema, type MemberBalance } from "@/schemas/balances";

import RecordSettlementDialog from "./RecordSettlementDialog";

interface Props {
  currency: string | null;
  canEdit?: boolean;
}

const Balances = ({ currency, canEdit = true }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const balancesQuery = useQuery<MemberBalance[]>({
    queryKey: ["balances"],
    queryFn: () =>
      fetchJson(
        "/api/balances",
        MemberBalancesSchema,
        "Failed to fetch balances",
      ),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const balances = balancesQuery.data ?? [];

  return (
    <CardShell className="h-full">
      <CardShellHeader
        title="Balances"
        description="Net amounts from shared expenses and settlements. No money moves inside the app."
        action={
          canEdit ? (
            <RecordSettlementDialog
              currency={currency}
              members={balances.map(({ userId, name }) => ({ userId, name }))}
              trigger={
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={balances.length === 0}
                >
                  <Handshake className="h-4 w-4" />
                  Record settlement
                </Button>
              }
            />
          ) : undefined
        }
      />
      <CardContent>
        <SkeletonWrapper isLoading={balancesQuery.isLoading}>
          {balances.length === 0 ? (
            <EmptyState
              icon={Users}
              hint="No other members yet. Invite someone to start splitting shared expenses."
            />
          ) : (
            <div className="space-y-2">
              {balances.map((balance) => (
                <div
                  key={balance.userId}
                  className="flex items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">{balance.name}</span>
                  {balance.balance === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      All settled up
                    </span>
                  ) : balance.balance > 0 ? (
                    <span className="text-sm font-semibold text-expense-foreground tabular-nums">
                      You owe {formatter.format(balance.balance)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-income-foreground tabular-nums">
                      {balance.name} owes you{" "}
                      {formatter.format(-balance.balance)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </SkeletonWrapper>
      </CardContent>
    </CardShell>
  );
};

export default Balances;
