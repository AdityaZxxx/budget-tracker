"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { InviteLink } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, PlusSquare, TrashIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ReactElement, ReactNode, useState } from "react";
import { toast } from "sonner";
import {
  createInviteLink,
  listInviteLinks,
  revokeInviteLink,
} from "../_actions/invite";

interface Props {
  trigger?: ReactNode;
}

const inviteUrl = (token: string) =>
  `${window.location.origin}/invite/${token}`;

const InviteLinkDialog = ({ trigger }: Props) => {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const { data: inviteLinks = [], isLoading } = useQuery<InviteLink[]>({
    queryKey: ["inviteLinks"],
    queryFn: listInviteLinks,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: createInviteLink,
    onSuccess: async () => {
      toast.success("Invite link created", { id: "invite-link" });
      await queryClient.invalidateQueries({ queryKey: ["inviteLinks"] });
    },
    onError: () => {
      toast.error("Unable to create invite link. Try again.", {
        id: "invite-link",
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInviteLink,
    onSuccess: async () => {
      toast.success("Invite link revoked", { id: "invite-link" });
      await queryClient.invalidateQueries({ queryKey: ["inviteLinks"] });
    },
    onError: () => {
      toast.error("Unable to revoke invite link. Try again.", {
        id: "invite-link",
      });
    },
  });

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied to clipboard", { id: "copy-invite-link" });
  };

  const primaryLink = inviteLinks[0];
  const primaryUrl = primaryLink ? inviteUrl(primaryLink.token) : null;

  const triggerElement = (trigger ?? (
    <Button>Invite</Button>
  )) as ReactElement;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={triggerElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite link</DialogTitle>
          <DialogDescription>
            Anyone who signs in through this link joins your household. Revoke
            it any time to stop new members from joining.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : inviteLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active invite link. Create one to share your household with
            another member.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="rounded-lg bg-white p-3">
                <QRCodeSVG value={primaryUrl ?? ""} size={168} />
              </div>
            </div>
            <div className="space-y-2">
              {inviteLinks.map((link) => {
                const url = inviteUrl(link.token);
                return (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-2"
                  >
                    <span className="truncate text-xs text-muted-foreground">
                      {url}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => copyLink(url)}
                        aria-label="Copy invite link"
                      >
                        <Copy />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={revokeMutation.isPending}
                        onClick={() => revokeMutation.mutate({ id: link.id })}
                        aria-label="Revoke invite link"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="gap-2"
          >
            {createMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <PlusSquare />
            )}
            Create new link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteLinkDialog;
