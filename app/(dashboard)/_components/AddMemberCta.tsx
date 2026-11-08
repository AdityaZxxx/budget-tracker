"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import InviteLinkDialog from "../manage/_components/InviteLinkDialog";

interface Props {
  memberCount: number;
}

const AddMemberCta = ({ memberCount }: Props) => {
  if (memberCount > 1) return null;

  return (
    <div className="container pt-6">
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">
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
      </Card>
    </div>
  );
};

export default AddMemberCta;
