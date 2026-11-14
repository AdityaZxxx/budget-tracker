import { FULL_MEMBER_ROLE, VIEW_ONLY_ROLE } from "@/lib/constants";
import { DomainError } from "@/lib/errors";

export type MemberRole = typeof FULL_MEMBER_ROLE | typeof VIEW_ONLY_ROLE;

export function parseMemberRole(role: string): MemberRole {
  return role === VIEW_ONLY_ROLE ? VIEW_ONLY_ROLE : FULL_MEMBER_ROLE;
}

// Fail-closed: only a full member role passes. Anything else is refused.
export function assertFullMemberRole(role: MemberRole) {
  if (role !== FULL_MEMBER_ROLE) {
    throw new DomainError(
      "View-only members cannot make changes in this household",
    );
  }
}
