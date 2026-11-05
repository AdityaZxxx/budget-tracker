# All app data is scoped to a Household, not to a User

The app previously scoped every record to the signed-in user. Sora is a couples/households product, so the shared space (the Household) is the primary scope: transactions, categories, budgets, and goals belong to a household, and users reach them through membership.

The repo is treated as fresh (zero existing users), so the schema moves to household scope directly with no data migration. Each new user automatically gets a personal Household, so solo use keeps working; an invite link adds the second member to the inviter's household.

Members are equal: any member can edit or delete any transaction, invite others, or remove others. When a member leaves, their transactions stay in the ledger, attributed to them.

## Considered Options

- Lazy personal Household per user, join by invite link (chosen): solo use and sharing are the same model.
- Invite creates a fresh shared Household and migrates the inviter's data (rejected): leaves two households to reconcile.
- Invite only works for brand-new users (rejected): punishes anyone who already tried the app solo.

## Consequences

- Every query resolves the member's household first; authorization is "is a member of this household," not "owns this row."
- Leaving does not delete history, so attribution is stored on the transaction, not derived from current membership.
