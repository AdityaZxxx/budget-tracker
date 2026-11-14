# Validation

The rules are written once: the lib/ seam parses its own schema before it writes, and the transports (web, MCP, CLI) are only filters in front of that contract. A regression in an input rule surfaces the same behaviour on every door.

## Sub-features

- `validation-date-impossible` an impossible day such as `2026-02-30` is rejected.
- `validation-range-inverted` `from` after `to` is rejected.
- `validation-range-90d` a range longer than 90 days is rejected.
- `validation-amount` zero, negative, non-finite, or over `1e12` is rejected. (`1e12` itself is allowed.)
- `validation-amount-boolean` a boolean passed as an amount is rejected.
- `validation-shares-misplaced` shares are rejected for an income or a personal transaction.
- `validation-shares-split` the member shares add up to the transaction amount or they are rejected.
- `validation-settlement-self` a member cannot record a settlement with themselves.
- `validation-category-mismatch` an unknown category name is rejected with `Category not found`.
- `validation-unknown-id` an unrecognised id is rejected with a plain message, never a Prisma trace.
- `validation-hard-budget` a shared expense over a hard budget cap is rejected with the message from the budget.
- `validation-text-caps` every free-text cap rejects over-length input (category 20, goal 50, bill 60, description 200, household 50, token 60).
- `validation-date-absent` an absent `from`/`to` defaults to the current month everywhere.

## How to get to it (user POV)

- The web form (every dialog is a form; zod runs client-side for feedback, the seam re-parses before anything writes).
- The MCP surface, used by an assistant (strict schemas with `isError: true` for rejected input).
- The CLI, which parses before it calls the tool; the seam re-parses regardless.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one budget (Groceries, soft, $500), one goal.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Happy payload.** `control-sora mcp get_overview` → reads the fixture back (5000 / 1900.5 / 3099.5).
- **Over the ceiling.** `control-sora mcp add_transaction '{"amount": 1000000000001, "category":"Groceries","type":"expense"}'` → `Amount must be at most 1,000,000,000,000 at amount`. No row is created. (`1000000000000` is accepted by design; delete the row afterwards.)
- **Boolean as amount.** `control-sora mcp add_transaction '{"amount": true, "category":"Groceries","type":"expense"}'` → `Amount must be a number at amount`. No row is created.
- **Impossible date.** `control-sora mcp add_transaction '{"amount": 5, "date":"2026-02-30","category":"Groceries","type":"expense"}'` → `Invalid date: 2026-02-30. Use the YYYY-MM-DD format.`
- **Inverted range.** `control-sora mcp list_transactions '{"from":"2026-11-14","to":"2026-11-01"}'` → `The start date is after the end date.`
- **Range longer than 90 days.** `control-sora mcp list_transactions '{"from":"2026-01-01","to":"2026-12-31"}'` → `The date range is longer than 90 days. Narrow it.`
- **Shares on income.** `control-sora mcp add_transaction '<shares on an income>'` → `Shares are only valid for shared expenses`.
- **Shares mismatch.** `control-sora mcp add_transaction '<shares totalling less than the transaction>'` → `The member shares add up to $4 but the expense is $10.`
- **Unknown category.** `control-sora mcp add_transaction '{"amount":5,"category":"Television","type":"expense"}'` → `Category not found`.
- **Wrong id delete.** `control-sora mcp delete_transaction '{"id":"not-a-real-id"}'` → `Transaction not found`.
- **Self settlement.** `control-sora mcp record_settlement '{"memberId":"<SELF_ID>","amount": 50}'` → `Cannot record a settlement with yourself`.
- **Web UI.** The dashboard's Add expense dialog on a Hard budget category blocks submission with the server's sentence from the budget, e.g. `Hard budget exceeded for Dining Out: the monthly limit is $50 and $200 is already spent, so this $20 expense would bring the month to $220.`
- **CLI.** `control-sora cli add-expense --amount 0 --category Groceries` → `Invalid --amount: 0. Use a positive number with at most two decimals, such as 500 or 12.50.` with exit 1.
- **Fixture at the end.** Re-read `control-sora mcp get_overview`; the fixture is 5000 / 1900.5 / 3099.5.

## Gotchas

- The web coerces first (zod at the action), the MCP tool rejects strictly; the sentence a user reads comes from the seam, not the filter.
- `2026-02-30` must be tested as having rolled over in `Date.UTC`; the rule is that the parsed parts round-trip exactly.
- `from` and `to` are inclusive; the 90-day cap counts both ends.
- The hard-cap rejection reports the exact amounts from the server, not a copied sentence in the UI; do not pin the text in assertions.
- Messages echo user input verbatim; never assume that a passing `category` was not subtly renamed since the fixture ran.
