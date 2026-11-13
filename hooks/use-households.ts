import { useQuery } from "@tanstack/react-query";

import { POLL_INTERVAL } from "@/lib/constants";

export type HouseholdsResponse = {
  active: { id: string };
  households: {
    id: string;
    name: string | null;
    currency: string | null;
    memberCount: number;
    joinedAt: string;
  }[];
};

export function useHouseholds() {
  return useQuery<HouseholdsResponse>({
    queryKey: ["households"],
    queryFn: async () => {
      const response = await fetch("/api/households");
      if (!response.ok) {
        throw new Error("Failed to load households");
      }
      return response.json();
    },
    staleTime: POLL_INTERVAL,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });
}
