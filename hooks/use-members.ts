import { useQuery } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { VIEW_ONLY_ROLE } from "@/lib/constants";

import { listMembers } from "../app/(dashboard)/manage/_actions/membership";

export function useMembers() {
  return useQuery({
    queryKey: ["householdMembers"],
    queryFn: listMembers,
    refetchInterval: 30_000,
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
