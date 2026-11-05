"use client";

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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  listNotifications,
  markAllRead,
} from "@/app/(dashboard)/_actions/notifications";

const NotificationBell = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: listNotifications,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  const { mutate: markRead, isPending } = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
    onError: () => {
      toast.error("Unable to mark notifications as read. Try again.", {
        id: "mark-all-read",
      });
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
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
            <div className="max-h-80 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex flex-col gap-0.5 px-2 py-2",
                    !notification.readAt && "bg-accent/50",
                  )}
                >
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
              ))}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Notifications</TooltipContent>
    </Tooltip>
  );
};

export default NotificationBell;
