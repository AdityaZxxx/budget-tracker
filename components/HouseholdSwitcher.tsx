"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, House, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useHouseholds } from "@/hooks/use-households";
import { DEFAULT_HOUSEHOLD_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

import {
  createHousehold,
  switchHousehold,
} from "../app/(dashboard)/manage/_actions/households";

interface HouseholdSwitcherProps {
  variant?: "default" | "row";
}

export default function HouseholdSwitcher({
  variant = "default",
}: HouseholdSwitcherProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const householdsQuery = useHouseholds();

  const households = householdsQuery.data?.households ?? [];
  const activeId = householdsQuery.data?.active.id;
  const active = households.find((household) => household.id === activeId);

  const { mutate: switchTo, isPending: isSwitching } = useMutation({
    mutationFn: switchHousehold,
    onSuccess: () => {
      queryClient.invalidateQueries();
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to switch household. Try again.", {
        id: "switch-household",
      });
    },
  });

  const { mutate: create, isPending: isCreating } = useMutation({
    mutationFn: () => createHousehold(name),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setCreateOpen(false);
      setName("");
      router.push("/");
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to create household. Try again.", {
        id: "create-household",
      });
    },
  });

  const showSwitcher = !householdsQuery.isSuccess || households.length > 1;

  if (!showSwitcher) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            variant === "row" ? (
              <Button
                variant="ghost"
                className="h-16 w-full justify-start gap-3 px-3 font-normal"
                aria-label="Switch household"
              />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                aria-label="Switch household"
              />
            )
          }
        >
          {variant === "row" ? (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <House className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="truncate text-sm leading-5 font-medium">
                  {active?.name ?? "Household"}
                </span>
                {active && (
                  <span className="text-xs leading-4 text-muted-foreground">
                    {active.memberCount}{" "}
                    {active.memberCount === 1 ? "member" : "members"}
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </>
          ) : (
            <>
              <House className="h-4 w-4" />
              <span className="max-w-32 truncate">
                {active?.name ?? "Household"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Households</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {households.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : (
            households.map((household) => (
              <DropdownMenuItem
                key={household.id}
                disabled={isSwitching || household.id === activeId}
                onClick={() => switchTo(household.id)}
                aria-current={household.id === activeId ? "true" : undefined}
                className={cn(
                  "gap-2",
                  household.id === activeId &&
                    "bg-accent text-accent-foreground data-disabled:opacity-100",
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  {household.name ?? DEFAULT_HOUSEHOLD_NAME}
                </span>
                <span
                  className={cn(
                    "text-xs text-muted-foreground tabular-nums",
                    household.id === activeId && "text-accent-foreground/70",
                  )}
                >
                  {household.memberCount}
                </span>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New household
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New household</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="household-name">Name</FieldLabel>
            <Input
              id="household-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Family, Flat 12"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim() && !isCreating) {
                  create();
                }
              }}
            />
          </Field>
          <DialogFooter>
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
              disabled={isCreating || !name.trim()}
              onClick={() => create()}
              className="w-full sm:w-auto"
            >
              {isCreating ? <Loader2 className="animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
