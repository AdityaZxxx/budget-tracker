# Validation

The rules are written once, at the lib/ seam: each writer parses its own schema before it touches prisma, and every transport (web action, MCP tool, CLI) sends through the same contract. Some rejection paths are handled by the transport's filter long before the seam sees the value; others are enforced at the seam itself. Both are intentional; the seam is the last line.

## Sub-features

- `validation-date-impossible` an impossible day such as `2026-02-30` is rejected.
- `validation-range-inverted` `from` after `to` is rejected.
- `validation-range-90d` a range longer than 90 days is rejected.
- `validation-amount` zero, negative, or over `1e12` is rejected. (`1e12` itself is allowed.)
- `validation-amount-precision` a sub-cent amount is rejected; more than two decimals fails `multipleOf(0.01)`.
- `validation-amount-boolean` a boolean passed as an amount is rejected.
- `validation-shares-misplaced` shares are rejected for an income or a personal transaction.
- `validation-shares-split` the member shares add up to the transaction amount or they are rejected.
- `validation-goal-unknown-id` a transaction tagged with an unknown goal id is rejected with `Goal not found`.
- `validation-recurring-unknown-id` an upcoming bill action targeted at an unknown id is rejected with `Recurring item not found`.
- `validation-settlement-self` a member cannot record a settlement with themselves.
- `validation-settlement-member-unknown` a transaction tagged to a member who is not in the household is rejected with `Member not found`.
- `validation-category-mismatch` an unknown category name is rejected with `Category not found`.
- `validation-unknown-id` an unrecognised id is rejected with a plain message, never a Prisma trace.
- `validation-hard-budget` a shared expense over a hard budget cap is rejected with the message from the budget.
- `validation-text-caps` every free-text cap rejects over-length input (category name 3–20, category icon ≤20, goal 50, recurring bill name ≤60, description ≤200, household name ≤50, token name ≤60, budget amount ≤1e12).
- `validation-settlement-shares` shares name each member at most once.
- `validation-view-only` a view-only member's writes are rejected by the seam.
- `validation-date-absent` an absent range defaults to the current month to today everywhere (exact bounds depend on the client).

## How to get to it (user POV)

- The web form; zod runs client-side for feedback, the seam re-parses before anything writes.
- The MCP surface, via an assistant; strict schemas reject non-conforming input before the seam sees it.
- The CLI, which parses before it calls the tool; the seam re-parses regardless.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one budget (`Groceries` soft, $500), one goal.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Happy payload.** `control-sora mcp get_overview` → reads the fixture back (5000 / 1900.5 / 3099.5).
- **Over the ceiling.** `control-sora mcp add_transaction '{"amount":1000000000001,"category":"Groceries","type":"expense"}'` → `Amount must be at most 1,000,000,000,000`.
- **Boolean as amount.** `control-sora mcp add_transaction '{"amount":true,"category":"Groceries","type":"expense"}'` → `Amount must be a number at amount`.
- **Impossible date.** `control-sora mcp add_transaction '{"amount":5,"date":"2026-02-30","category":"Groceries","type":"expense"}'` → `Invalid date: 2026-02-30. Use the YYYY-MM-DD format.`
- **Inverted range.** `control-sora mcp list_transactions '{"from":"2026-11-14","to":"2026-11-01"}'` → `The start date is after the end date.`
- **Range longer than 90 days.** `control-sora mcp list_transactions '{"from":"2026-01-01","to":"2026-12-31"}'` → `The date range is longer than 90 days. Narrow it.`
- **CLI.** `control-sora cli add-expense --amount 0 --category Groceries` → `Invalid --amount: 0. Use a positive number with at most two decimals, such as 500 or 12.50.` with exit 1.
- **Hard budget.** With a hard budget present for a category the member is about to spend over, `add_transaction` rejects with the budget's exact sentence.
- **MCP date default.** `list_transactions '{}'` returns the current month through today.
- **Fixture at the end.** Re-read `control-sora mcp get_overview`; the fixture is 5000 / 1900.5 / 3099.5.

## Gotchas

- On the MCP path a strict-schema mismatch is caught by the SDK before the seam, so the text varies between tool and seam. On the web path the seam message is what surfaces.
- `2026-02-30` must be tested as having rolled over in `Date.UTC`; the rule is that the parsed parts round-trip exactly.
- `from` and `to` are inclusive; the 90-day cap counts both ends.
- The cap for the web picker is the same MAX_DATE_RANGE = 90 as the seam.
- The 1e12 cap is inclusive; only `> 1e12` is rejected.
- The hard-budget rejection toast reports the exact amounts from the server; do not pin that string for assertions.
- Messages echo user input verbatim; never assume that `Television` is not a category because you renamed one last week.
