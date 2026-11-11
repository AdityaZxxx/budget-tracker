"use client";

import type { Currency } from "../lib/currencies";
import type { Household } from "@prisma/client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

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
import { POLL_INTERVAL } from "@/lib/constants";

import { UpdateUserCurrency } from "../app/wizard/_actions/userSettings";
import { Currencies } from "../lib/currencies";
import SkeletonWrapper from "./SkeletonWrapper";

export function CurrencyComboBox() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();

  const household = useQuery<Household>({
    queryKey: ["household"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  // The household query owns the currency; a refetch is what changes it.
  const selectedCurrency = household.data
    ? Currencies.find(
        (currency) => currency.value === household.data.currency,
      ) || null
    : null;

  const mutation = useMutation({
    mutationFn: UpdateUserCurrency,
    onSuccess: (data: Household) => {
      toast.success("Currency updated", {
        id: "update-currency",
      });
      // Write the saved currency into the cache so the new value shows at
      // once, and a later refetch still replaces it with the server's copy.
      queryClient.setQueryData<Household>(["household"], (previous) =>
        previous ? { ...previous, currency: data.currency } : previous,
      );
    },
    onError: () => {
      toast.error("Unable to update currency. Try again.", {
        id: "update-currency",
      });
    },
  });

  const selectOption = (currency: Currency | null) => {
    if (!currency) {
      toast.error("Select a currency to continue");
      return;
    }
    toast.loading("Updating currency…", {
      id: "update-currency",
    });
    mutation.mutate(currency.value);
  };

  const TriggerButton = (
    <Button
      variant="outline"
      className="w-full justify-start text-left"
      disabled={mutation.isPending}
    >
      {selectedCurrency ? <>{selectedCurrency.label}</> : <>Select currency…</>}
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
                    null,
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
