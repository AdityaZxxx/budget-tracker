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
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronsUpDown } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { UpdateUserCurrency } from "../app/wizard/_actions/userSettings";
import { Currencies, Currency } from "../lib/currencies";
import { UserSettings } from "../lib/generated/prisma";
import SkeletonWrapper from "./SkeletonWrapper";

export function CurrencyComboBox() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [selectedCurrency, setSelectedCurrency] =
    React.useState<Currency | null>(null);

  const userSettings = useQuery<UserSettings>({
    queryKey: ["userSettings"],
    queryFn: () => fetch("/api/user-settings").then((res) => res.json()),
  });

  React.useEffect(() => {
    if (!userSettings.data) return;
    const userCurrency = Currencies.find(
      (currency) => currency.value === userSettings.data.currency
    );
    if (userCurrency) setSelectedCurrency(userCurrency);
  }, [userSettings.data]);

  const mutation = useMutation({
    mutationFn: UpdateUserCurrency,
    onSuccess: (data: UserSettings) => {
      toast.success("Currency update successfully", {
        id: "update-currency",
      });
      setSelectedCurrency(
        Currencies.find((c) => c.value === data.currency) || null
      );
    },
    onError: (e) => {
      toast.error("Something wnet wrong", {
        id: "update-currency",
      });
    },
  });

  const selectOption = React.useCallback(
    (currency: Currency | null) => {
      if (!currency) {
        toast.error("Please select a currency");
        return;
      }
      toast.loading("Updating Currency...", {
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
        <>Select currency...</>
      )}
      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isDesktop) {
    return (
      <SkeletonWrapper isLoading={userSettings.isFetching}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
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
    <SkeletonWrapper isLoading={userSettings.isFetching}>
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
      <CommandInput placeholder="Filter currency..." />
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
