"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { joinHouseholdByToken } from "../_actions/invite";

interface Props {
  token: string;
  householdName: string | null;
  inviterName: string | null;
}

const JoinHouseholdCard = ({ token, householdName, inviterName }: Props) => {
  const { mutate: join, isPending } = useMutation({
    mutationFn: () => joinHouseholdByToken(token),
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to join the household. Try again.",
        {
          id: "join-household",
        },
      );
    },
  });

  return (
    <Card className="mt-12 w-[min(400px,calc(100vw-2rem))]">
      <CardHeader>
        <CardTitle className="text-2xl">
          Join {householdName ?? "this household"}
        </CardTitle>
        <CardDescription>
          {inviterName
            ? `${inviterName} invited you to share this household's ledger: transactions, budgets, and goals.`
            : "You have been invited to share this household's ledger: transactions, budgets, and goals."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full gap-2"
          disabled={isPending}
          onClick={() => join()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Users className="h-4 w-4" />
          )}
          Join household
        </Button>
      </CardContent>
    </Card>
  );
};

export default JoinHouseholdCard;
