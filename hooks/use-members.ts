import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { POLL_INTERVAL, VIEW_ONLY_ROLE } from "@/lib/constants";

import { listMembers } from "../app/(dashboard)/manage/_actions/membership";

export function useMembers() {
  return useQuery({
    queryKey: ["householdMembers"],
    queryFn: listMembers,
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

export function useCallerRole() {
  const { data: session } = useSession();
  const membersQuery = useMembers();

  const self = membersQuery.data?.find(
    (member) => member.user.id === session?.user.id,
  );

  return {
    role: self?.role,
    canEdit: self ? self.role !== VIEW_ONLY_ROLE : true,
  };
}
