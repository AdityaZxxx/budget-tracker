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
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InviteLink } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, PlusSquare, TrashIcon } from "lucide-react";
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
  const [showQr, setShowQr] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1500);
  };

  const triggerElement = (trigger ?? <Button>Invite</Button>) as ReactElement;

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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Show QR codes
              </span>
              <Switch
                checked={showQr}
                onCheckedChange={setShowQr}
                aria-label="Show QR codes"
              />
            </div>
            <div className="space-y-3">
              {inviteLinks.map((link) => {
                const url = inviteUrl(link.token);
                return (
                  <div
                    key={link.id}
                    className="flex flex-col items-center gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                  >
                    {showQr && (
                      <div className="shrink-0 rounded-md bg-white p-2 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
                        <QRCodeSVG value={url} size={112} />
                      </div>
                    )}
                    <div className="w-full min-w-0 flex-1 space-y-2">
                      <span
                        className="block truncate text-xs text-muted-foreground"
                        title={url}
                      >
                        {url}
                      </span>
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => copyLink(url, link.id)}
                                aria-label={
                                  copiedId === link.id
                                    ? "Copied"
                                    : "Copy invite link"
                                }
                              />
                            }
                          >
                            {copiedId === link.id ? <Check /> : <Copy />}
                          </TooltipTrigger>
                          <TooltipContent>
                            {copiedId === link.id
                              ? "Copied"
                              : "Copy invite link"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            render={<span className="inline-flex" />}
                          >
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:bg-destructive/10"
                              disabled={revokeMutation.isPending}
                              onClick={() =>
                                revokeMutation.mutate({ id: link.id })
                              }
                              aria-label="Revoke invite link"
                            >
                              <TrashIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Revoke invite link</TooltipContent>
                        </Tooltip>
                      </div>
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
