"use client";

import { Household } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ReactElement, ReactNode, useMemo, useState } from "react";
import { NumericFormat } from "react-number-format";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Currencies } from "@/lib/currencies";

import { RecordSettlement } from "../_actions/balance";

interface Props {
  trigger: ReactNode;
  members: { userId: string; name: string }[];
  household: Household;
}

const RecordSettlementDialog = ({ trigger, members, household }: Props) => {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState(0);

  const queryClient = useQueryClient();

  const currency = Currencies.find((c) => c.value === household.currency);

  const { thousandSeparator, decimalSeparator } = useMemo(() => {
    const formatter = new Intl.NumberFormat(currency?.locale, {
      style: "decimal",
    });
    const parts = formatter.formatToParts(1234.5);
    const ts = parts.find((p) => p.type === "group")?.value;
    const ds = parts.find((p) => p.type === "decimal")?.value;
    return {
      thousandSeparator: ts,
      decimalSeparator: ds,
    };
  }, [currency]);

  const { mutate, isPending } = useMutation({
    mutationFn: RecordSettlement,
    onSuccess: () => {
      toast.success("Settlement recorded", {
        id: "record-settlement",
      });
      queryClient.invalidateQueries({
        queryKey: ["balances"],
      });
      queryClient.invalidateQueries({
        queryKey: ["transactions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["overview"],
      });
      setMemberId("");
      setAmount(0);
      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to record settlement. Try again.", {
        id: "record-settlement",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      toast.error("Select a member", { id: "record-settlement" });
      return;
    }
    if (!amount || amount <= 0) {
      toast.error("Enter an amount greater than zero", {
        id: "record-settlement",
      });
      return;
    }
    toast.loading("Recording settlement…", { id: "record-settlement" });
    mutate({ memberId, amount });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            Record a settlement
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Field>
            <FieldLabel htmlFor="settlement-member">Member</FieldLabel>
            <Select
              value={memberId}
              onValueChange={(value) => {
                if (value === null) return;
                setMemberId(value);
              }}
            >
              <SelectTrigger id="settlement-member" className="w-full">
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.userId} value={member.userId}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldDescription className="text-xs sm:text-sm">
              The member you paid. The settlement is recorded under your name.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="settlement-amount">Amount</FieldLabel>
            <NumericFormat
              customInput={Input}
              id="settlement-amount"
              placeholder="0.00"
              value={amount}
              onValueChange={(values) => {
                setAmount(values.floatValue ?? 0);
              }}
              thousandSeparator={thousandSeparator}
              decimalSeparator={decimalSeparator}
              decimalScale={2}
              allowNegative={false}
            />
            <FieldDescription className="text-xs sm:text-sm">
              How much you paid them
            </FieldDescription>
          </Field>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose
              render={
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                />
              }
            >
              Cancel
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {!isPending ? "Record" : <Loader2 className="animate-spin" />}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordSettlementDialog;
