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

const InvitePartnerCta = ({ memberCount }: Props) => {
  if (memberCount > 1) return null;

  return (
    <div className="container pt-6">
      <Card className="border-emerald-700/30 bg-emerald-500/5 transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Invite your partner</CardTitle>
          <CardDescription>
            Share a revocable link or QR code to add another member to your
            household. You will both see the same ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteLinkDialog
            trigger={
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                Invite your partner
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default InvitePartnerCta;
