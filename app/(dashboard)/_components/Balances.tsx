"use client";

import { useQuery } from "@tanstack/react-query";
import { Handshake } from "lucide-react";

import SkeletonWrapper from "@/components/SkeletonWrapper";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getFormatterForCurrency } from "@/lib/helpers";

import { getHouseholdBalances } from "../_actions/balance";
import RecordSettlementDialog from "./RecordSettlementDialog";

interface Props {
  currency: string | null;
  canEdit?: boolean;
}

const Balances = ({ currency, canEdit = true }: Props) => {
  const formatter = getFormatterForCurrency(currency ?? "USD");

  const balancesQuery = useQuery({
    queryKey: ["balances"],
    queryFn: getHouseholdBalances,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const balances = balancesQuery.data ?? [];

  return (
    <div className="container mt-12">
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl">Balances</CardTitle>
              <CardDescription>
                Net amounts from shared expenses and settlements. No money moves
                inside the app.
              </CardDescription>
            </div>
            {canEdit && (
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SkeletonWrapper isLoading={balancesQuery.isLoading}>
            {balances.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No other members yet. Invite someone to start splitting
                expenses.
              </p>
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
                      <span className="text-sm font-semibold text-rose-600 tabular-nums dark:text-rose-400">
                        You owe {formatter.format(balance.balance)}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
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
      </Card>
    </div>
  );
};

export default Balances;
