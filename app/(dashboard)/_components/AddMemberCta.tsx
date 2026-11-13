"use client";

import { UserPlus, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardShell } from "@/components/ui/card-shell";

import InviteLinkDialog from "../manage/_components/InviteLinkDialog";

const DISMISSAL_KEY = "sora:add-member-cta-dismissed";

const subscribe = () => () => {};
const getSnapshot = () => window.localStorage.getItem(DISMISSAL_KEY) === "1";
const getServerSnapshot = () => false;

interface Props {
  memberCount: number;
}

const AddMemberCta = ({ memberCount }: Props) => {
  const storedDismissal = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [hidden, setHidden] = useState(false);

  if (memberCount > 1 || storedDismissal || hidden) {
    return null;
  }

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSAL_KEY, "1");
    } catch {
      setHidden(true);
      return;
    }
    setHidden(true);
  };

  return (
    <div className="container mt-6">
      <CardShell className="relative">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide this suggestion"
          className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
        <CardHeader>
          <CardTitle className="text-lg">
            Add a Member any time to share this ledger
          </CardTitle>
          <CardDescription>
            Share a revocable link or QR code and everyone you add sees the same
            transactions, budgets, and goals. Tracking on your own works fine
            too.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteLinkDialog
            trigger={
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite a Member
              </Button>
            }
          />
        </CardContent>
      </CardShell>
    </div>
  );
};

export default AddMemberCta;
