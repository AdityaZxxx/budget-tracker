"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  listNotifications,
  markAllRead,
} from "@/app/(dashboard)/_actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { POLL_INTERVAL, UNUSUAL_SPENDING_TYPE } from "@/lib/constants";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await listNotifications();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;
  const hasUnreadWarning = notifications.some(
    (notification) =>
      !notification.readAt && notification.type === UNUSUAL_SPENDING_TYPE,
  );

  const { mutate: markRead, isPending } = useMutation({
    mutationFn: async () => {
      const res = await markAllRead();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Unable to mark the notifications as read. Refresh the page and try again.",
        {
          id: "mark-all-read",
        },
      );
    },
  });

  return (
    <Tooltip>
      <DropdownMenu>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
                />
              }
            />
          }
        >
          <Bell />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white",
                hasUnreadWarning ? "bg-amber-500" : "bg-destructive",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </TooltipTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[min(20rem,calc(100vw-2rem))]"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0">
                Notifications
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isPending || unreadCount === 0}
              onClick={() => markRead()}
              className="gap-1.5 px-1.5 text-xs"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </DropdownMenuItem>
          </div>
          <DropdownMenuSeparator />
          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ScrollArea viewportClassName="max-h-80">
              {notifications.map((notification) => {
                const isWarning = notification.type === UNUSUAL_SPENDING_TYPE;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-2 px-2 py-2",
                      !notification.readAt &&
                        (isWarning ? "bg-amber-500/10" : "bg-accent/50"),
                    )}
                  >
                    {isWarning && (
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15">
                        <TriangleAlert
                          aria-hidden="true"
                          className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400"
                        />
                      </span>
                    )}
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p
                        className={cn(
                          "text-sm",
                          !notification.readAt && "font-medium",
                        )}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </ScrollArea>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Notifications</TooltipContent>
    </Tooltip>
  );
};

export default NotificationBell;
