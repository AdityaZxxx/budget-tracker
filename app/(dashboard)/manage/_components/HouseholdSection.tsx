"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { House, Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholds } from "@/hooks/use-households";
import { DEFAULT_HOUSEHOLD_NAME } from "@/lib/constants";

import { renameHousehold } from "../_actions/households";

const HouseholdSection = ({ canEdit }: { canEdit: boolean }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const householdsQuery = useHouseholds();
  const active = householdsQuery.data?.households.find(
    (household) => household.id === householdsQuery.data?.active.id,
  );
  const displayName = active?.name ?? DEFAULT_HOUSEHOLD_NAME;

  const { mutate: rename, isPending } = useMutation({
    mutationFn: () => renameHousehold(name),
    onSuccess: () => {
      toast.success("Space renamed", {
        id: "rename-household",
      });

      queryClient.invalidateQueries({
        queryKey: ["households"],
      });
      setOpen(false);
    },
    onError: () => {
      toast.error("Unable to rename. Try again.", {
        id: "rename-household",
      });
    },
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Your space</CardTitle>
          <CardDescription>
            Rename the space where you keep your money
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <House className="h-4 w-4 shrink-0 text-muted-foreground" />
              {householdsQuery.isLoading ? (
                <Skeleton className="h-5 w-32" />
              ) : (
                <span className="truncate text-sm font-medium">
                  {displayName}
                </span>
              )}
            </span>
            {canEdit && (
              <Dialog
                open={open}
                onOpenChange={(next) => {
                  setOpen(next);
                  if (next) {
                    setName(active?.name ?? "");
                  }
                }}
              >
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm" className="gap-2" />
                  }
                >
                  <Pencil className="h-4 w-4" />
                  Rename
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rename your space</DialogTitle>
                  </DialogHeader>
                  <Field>
                    <FieldLabel htmlFor="household-rename">Name</FieldLabel>
                    <Input
                      id="household-rename"
                      value={name}
                      maxLength={50}
                      placeholder="e.g. Family, Flat 12"
                      onChange={(event) => setName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !isPending) {
                          rename();
                        }
                      }}
                    />
                  </Field>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="secondary" type="button" />}
                    >
                      Cancel
                    </DialogClose>
                    <Button
                      onClick={() => rename()}
                      disabled={isPending}
                      className="gap-2"
                    >
                      {!isPending && "Save"}
                      {isPending && <Loader2 className="animate-spin" />}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default HouseholdSection;
