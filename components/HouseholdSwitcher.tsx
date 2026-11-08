"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, House, Loader2, Plus } from "lucide-react";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import {
  createHousehold,
  switchHousehold,
} from "../app/(dashboard)/manage/_actions/households";

type HouseholdsResponse = {
  active: { id: string };
  households: {
    id: string;
    name: string | null;
    currency: string | null;
    memberCount: number;
  }[];
};

export default function HouseholdSwitcher() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const householdsQuery = useQuery<HouseholdsResponse>({
    queryKey: ["households"],
    queryFn: async () => {
      const response = await fetch("/api/households");
      if (!response.ok) {
        throw new Error("Failed to load households");
      }
      return response.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const households = householdsQuery.data?.households ?? [];
  const activeId = householdsQuery.data?.active.id;
  const active = households.find((household) => household.id === activeId);

  const { mutate: switchTo, isPending: isSwitching } = useMutation({
    mutationFn: switchHousehold,
    onSuccess: () => {
      // Everything on screen is household-scoped, so all queries refetch.
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
      // The new household has no currency, so the dashboard routes into the
      // wizard to set it up.
      router.push("/");
      router.refresh();
    },
    onError: () => {
      toast.error("Unable to create household. Try again.", {
        id: "create-household",
      });
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              aria-label="Switch household"
            />
          }
        >
          <House className="h-4 w-4" />
          <span className="max-w-32 truncate">
            {active?.name ?? "Household"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel>Households</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {households.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Loading…</p>
          ) : (
            households.map((household) => (
              <DropdownMenuItem
                key={household.id}
                disabled={isSwitching || household.id === activeId}
                onClick={() => switchTo(household.id)}
                className="gap-2"
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    household.id === activeId ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="min-w-0 flex-1 truncate">
                  {household.name ?? "My household"}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
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
