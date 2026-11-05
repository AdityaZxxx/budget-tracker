"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Household } from "@prisma/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { UpdateUserCurrency } from "../app/wizard/_actions/userSettings";
import { Currencies, Currency } from "../lib/currencies";
import SkeletonWrapper from "./SkeletonWrapper";

export function CurrencyComboBox() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [selectedCurrency, setSelectedCurrency] =
    React.useState<Currency | null>(null);

  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  React.useEffect(() => {
    if (!household.data) return;
    const userCurrency = Currencies.find(
      (currency) => currency.value === household.data.currency
    );
    if (userCurrency) setSelectedCurrency(userCurrency);
  }, [household.data]);

  const mutation = useMutation({
    mutationFn: UpdateUserCurrency,
    onSuccess: (data: Household) => {
      toast.success("Currency updated", {
        id: "update-currency",
      });
      setSelectedCurrency(
        Currencies.find((c) => c.value === data.currency) || null
      );
    },
    onError: (e) => {
      toast.error("Unable to update currency. Try again.", {
        id: "update-currency",
      });
    },
  });

  const selectOption = React.useCallback(
    (currency: Currency | null) => {
      if (!currency) {
        toast.error("Select a currency to continue");
        return;
      }
      toast.loading("Updating currency…", {
        id: "update-currency",
      });
      mutation.mutate(currency.value);
    },
    [mutation]
  );

  const TriggerButton = (
    <Button
      variant="outline"
      className="w-full justify-start text-left"
      disabled={mutation.isPending}
    >
      {selectedCurrency ? (
        <>{selectedCurrency.label}</>
      ) : (
        <>Select currency…</>
      )}
      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isDesktop) {
    return (
      <SkeletonWrapper isLoading={household.isLoading}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={TriggerButton} />
          <PopoverContent className="w-full p-0" align="start">
            <CurrencyList
              setOpen={setOpen}
              setSelectedCurrency={selectOption}
            />
          </PopoverContent>
        </Popover>
      </SkeletonWrapper>
    );
  }

  return (
    <SkeletonWrapper isLoading={household.isLoading}>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
        <DrawerContent>
          <div className="mt-4 border-t">
            <CurrencyList
              setOpen={setOpen}
              setSelectedCurrency={selectOption}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </SkeletonWrapper>
  );
}

function CurrencyList({
  setOpen,
  setSelectedCurrency,
}: {
  setOpen: (open: boolean) => void;
  setSelectedCurrency: (currency: Currency | null) => void;
}) {
  return (
    <Command>
      <CommandInput placeholder="Filter currency…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {Currencies.map((currency) => (
            <CommandItem
              key={currency.value}
              value={currency.value}
              onSelect={(value) => {
                setSelectedCurrency(
                  Currencies.find((priority) => priority.value === value) ||
                    null
                );
                setOpen(false);
              }}
            >
              {currency.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
