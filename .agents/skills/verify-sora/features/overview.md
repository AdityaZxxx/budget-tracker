# Overview

The dashboard is where a household sees the month's shared numbers at a glance: the stat cards, the shared spending card, the category breakdowns, the history chart, and the insights panel.

## Sub-features

- `overview-income-expense-net` the stat cards show Income, Expense, and Balance for the picked date range.
- `overview-by-category` both category lists show shared transactions for the picked range, with the largest first.
- `overview-balance` the balance card shows the net of shared transactions and settlements.
- `overview-shared-spending` a separate card shows the month's shared spend to date.
- `overview-history` a chart of income and expenses over the last six months (or year), with previous/next chevrons.
- `overview-insights` the savings rate for the current month and a six-month trailing chart of income vs expense.
- `overview-savings-goal` excluded: see Goals.

## How to get to it (user POV)

- Open `/` for a direct link to the dashboard.
- Pick a date range with the picker; the default is month-to-date.
- Toggle `Month` / `Year` on the history chart.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household (`control-sora reset`) is in place, with two members.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open http://127.0.0.1:3210/`. The heading reads `Hello, Avery!`; the stats render; the shared-spending card reads `$320.50` spent of $500 and `$179.50 remaining`.
- **Read the stats.** Run `control-sora browser get text body`. Assert `Income` `$5,000`, `Expense` `$1,900.50`, `Balance` `$3,099.50`. The category lists show `Salary $5,000` and the five expense categories.
- **Change the range.** Run `control-sora browser find role button click --name "Nov 14, 2026"`, then `control-sora browser find role option click --name "This Month"`. The trigger reads `Nov 1, 2026 - Nov 14, 2026`.
- **Toggle the history granularity.** Run `control-sora browser find role tab click --name "Year"`. The label reads `2026`. Run the same with `Month` to switch back.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/overview/dashboard.png`.
- **MCP.** `control-sora mcp get_overview` → returns the same totals.

## Gotchas

- Totals count only `shared: true` transactions (all inclusive), from any member.
- The category lists are not zero-filled: a category with no shared transaction in the range does not appear; an empty range shows `No data for the selected period`.
- The balance and shared-spend cards include settlements (the category `Settlement` is excluded from category breakdowns and budget progress but not from totals).
- A solo household has no shared-spending card; the card renders only when memberCount > 1.
- The date range is capped at 90 days; a wider range is refused by the picker with a toast.
- The picker trigger always shows today's date, not the month's range, even when set to a custom range.
- Personal transactions do not contribute to any of these numbers.
