"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { LogOut, UserMinus } from "lucide-react";
import { listMembers } from "../_actions/membership";
import LeaveHouseholdDialog from "./LeaveHouseholdDialog";
import RemoveMemberDialog from "./RemoveMemberDialog";

const MembersSection = () => {
  const { data: session } = useSession();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["householdMembers"],
    queryFn: listMembers,
  });

  return (
    <section>
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Members</CardTitle>
          <CardDescription>
            Everyone in your household can add, edit, and remove transactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const isSelf = member.user.id === session?.user.id;
                const initials = member.user.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.user.image ?? undefined} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.user.name}
                          {isSelf ? " (you)" : ""}
                        </p>
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={member.user.email}
                        >
                          {member.user.email}
                        </p>
                      </div>
                    </div>
                    {!isSelf && (
                      <RemoveMemberDialog
                        member={member}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10"
                            aria-label={`Remove ${member.user.name} from household`}
                          >
                            <UserMinus />
                          </Button>
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <Separator />
          <LeaveHouseholdDialog
            trigger={
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                Leave household
              </Button>
            }
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default MembersSection;
