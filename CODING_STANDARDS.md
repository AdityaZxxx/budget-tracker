# Coding Standards

Sora is a free finance app for couples and households: one shared ledger per Household, with budgets, goals, and balances. Every member of a Household has equal rights.

These are the judgement calls this repo makes. Mechanical rules (where a file lives, what a function is called) belong in the linter rather than here, because a check fails loudly and prose drifts silently. The product also runs on free tiers only (`docs/adr/0002-free-forever-zero-cost.md`), so a diff that needs a paid service is a finding.

## Household scope is the authorization model

Authorization is membership, not ownership. Resolve the caller's Household first, then scope every read and write by `householdId`.

Attribution and visibility are different questions. A transaction records the member who added it (`addedById`), and that member can leave the household without their transactions disappearing. So "who added it" never answers "who can see it", and only the household does.

There is no owner. Every member can edit or delete any transaction, invite others, and remove others, so a diff that adds an owner check is a finding.

A reviewer should be able to point at the `householdId` filter in every query the diff touches. A query that filters by `addedById` where the intent was "in this household" is a bug even when it returns the right rows today.

## Shared and personal are two ledgers

`shared: true` counts toward household totals, budgets, and history rollups. `shared: false` is visible only to the member who added it and stays out of all three. Settlements are personal.

Two filter shapes cover the whole codebase, and each is for one purpose:

- **Household aggregate** (totals, category stats, budget spend): `shared: true` only.
- **Member view** (transaction history, export): `shared: true` plus the caller's own, as `OR: [{ shared: true }, { addedById: userId }]`.

When a diff adds a query, decide which of the two it is before writing the filter. An aggregate that forgets `shared: true` leaks one member's private spending into a shared number. A member view that filters on `shared: true` alone hides the caller's own personal rows.

## Rollups move with the transaction

`MonthHistory` and `YearHistory` are denormalised counters that the dashboard reads instead of scanning transactions. Creating or deleting a shared transaction updates them in the same `prisma.$transaction`, incrementing or decrementing the matching month. Personal transactions leave them alone, because they were never counted.

A diff that writes a shared transaction without touching the rollups passes every type check and silently corrupts the dashboard. Check the pair: transaction write, rollup write, same transaction, same `shared` condition.

## Dates are UTC

Transaction dates are stored as UTC (`dateToUtcDate`) and rollup buckets use the UTC getters, so a transaction's month is its UTC month. Budget months follow the same calendar (`monthRangeFor`).

Mixing local-time getters into a bucket key files a transaction under a different month than the one the rollups counted. Use the UTC getters for any date that names a bucket.

## Money is formatted through the household currency

The household holds one currency. Format amounts with `getFormatterForCurrency(household.currency ?? "USD")`; it picks the locale from the currency and drops the decimals on whole amounts.

A diff that formats an amount inline, or hardcodes a currency, breaks a household whose currency is not USD.

## Budgets are soft or hard, per budget

A budget is a monthly limit on one category. `soft` warns at 80% and 100%; `hard` rejects the transaction that would take the month over the limit. The mode is a property of the budget, not a global setting.

Budgets apply to shared expenses only. Settlements are excluded from budget spend, because a settlement is not spending. The threshold check reads the month's spend before the transaction lands, so adding one recomputes rather than double counts, and one transaction produces at most one notification, for the highest threshold it crossed.

## Writes are actions, reads are routes

Mutations are server actions, so the household check runs inside the same call as the write, with no second entry point to forget. Reads are `GET` routes, so the client can poll them and the UI stays live without a websocket.

A diff that adds a mutation should land as an action with the household check inside it. A diff that adds a query should follow the polling pattern its neighbouring queries already use, and a diff that mutates data should invalidate the query keys it affects.

## Comments carry a why

A comment earns its place only when it states something the code cannot: the reason behind a choice, a non-obvious constraint, a trap. Everything else is noise the next reader has to verify.

Naming the trap is the point. "Personal transactions were never counted in the household rollups" tells the reader why the decrement is conditional; "update rollups" tells them nothing.

## Verify before committing

The working tree must pass the same checks CI runs. `.github/workflows/ci.yml` is the source of truth for which checks those are.

The repo has no test suite, by decision (`docs/ROADMAP.md`). The build is the safety net.

Lint and format are mechanical, and the tools own them: `oxlint` reports the rules, `oxfmt` decides the layout. Run `pnpm lint` and `pnpm fmt` before committing, and let the formatter rewrite the file rather than hand-tuning whitespace or import order.

A rule that fires on correct code gets fixed in the code, or, with a stated reason, in `.oxlintrc.json`. A one-off exception that the config cannot express may carry a scoped suppression comment, but only with the reason written next to it.

## Commit protocol

One commit per ticket, on the current branch. Conventional Commits: a type, a short subject, no body, no implementation chatter. The subject says what changed, not what you did.

Formatting is the one split. The formatter's commit is mechanical and lands on its own, so a reviewer can skip it and read the change underneath.

Work stays local. The remote exists, but pushes are not part of the flow.

A ticket worked in the main session is committed after its review. A ticket worked by a parallel subagent leaves its changes uncommitted for the main session to integrate, because concurrent commits on one branch collide.

## Keeping this file honest

When a rule here contradicts the code, the code is what ships, so fix this file in the same change. When a rule here contradicts an ADR, surface the conflict rather than quietly picking one.
