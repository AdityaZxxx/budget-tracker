export const MAX_DATE_RANGE = 90;

// How long a poll-driven query stays fresh. Focus refetches are gated on
// freshness, so this must not be shorter than the interval the queries poll at.
export const POLL_INTERVAL = 30_000;

export const ACTIVE_HOUSEHOLD_COOKIE = "sora_active_household";

export const FULL_MEMBER_ROLE = "member";
export const VIEW_ONLY_ROLE = "view_only";

// What the UI renders when the household has no name (the seeded personal
// household is created that way).
export const DEFAULT_HOUSEHOLD_NAME = "My household";

export const READ_ONLY_SCOPE = "read-only";
export const READ_WRITE_SCOPE = "read-write";

// Written by the unusual-spending evaluator; the bell renders these with a
// warning treatment.
export const UNUSUAL_SPENDING_TYPE = "unusual_spending";

// System category for settlement transactions; hidden from category
// stats and pickers because it is not spending.
export const SETTLEMENT_CATEGORY_NAME = "Settlement";
export const SETTLEMENT_CATEGORY_ICON = "🤝";
export const SETTLEMENT_DESCRIPTION_PREFIX = "Settlement with ";
