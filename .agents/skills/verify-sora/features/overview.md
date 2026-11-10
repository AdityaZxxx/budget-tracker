# Overview

The overview is the dashboard a member lands on: what came in, what went out, what is left, where it went, and how the ledger looked over time.

## Sub-features

- `overview-totals` shows income, expense, and balance for the selected range.
- `overview-categories` breaks income and expense down per category.
- `overview-range` changes the range with the date picker and its presets.
- `overview-history` charts the month or the year.
- `overview-empty` says so plainly when the range holds nothing.

## How to get to it (user POV)

- Choose `Dashboard` in the top navigation.
- Open `/` directly.
- A signed-in member without a currency is redirected to the wizard instead.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): income 5,000, expenses 1,900.50, net 3,099.50.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open http://127.0.0.1:3210/`. The heading reads `Hello, Avery! 👋` and the `Overview` section is on the page.
- **Read the totals.** Run `control-sora browser get text body`. The page shows `Income` `+$5,000`, `Expense` `-$1,900.50`, and `Balance` `+$3,099.50`.
- **Read the category breakdown.** The same output shows `Incomes by category` with `Salary $5,000`, and `Expenses by category` with `Rent $900`, `Groceries $320.50`, `Travel $300`, `Dining Out $200`, and `Utilities $180`.
- **Read the shared spending card.** The same output shows `Shared spending this month` and `$1,900.50`.
- **Change the range.** Run `control-sora browser find role button click --name "Nov 10, 2026"`, then `control-sora browser find role button click --name "Last Month"`. The stats read `$0` for income, expense, and balance, and both category lists read `No data for the selected period`. The trigger now reads `Oct 1, 2026 - Oct 31, 2026`.
- **Put the range back.** Run `control-sora browser find role button click --name "Oct 1, 2026 - Oct 31, 2026"` and then `control-sora browser find role button click --name "This Month"`. The totals read `$5,000` and `$1,900.50` again.
- **Switch the history chart to the year.** Run `control-sora browser find role tab click --name "Year"`. The month combobox disappears and only the year combobox stays. Run `control-sora browser find role tab click --name "Month"` to go back.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/overview/dashboard.png`. The screenshot shows the three totals, both category lists, the shared spending card, and the history chart.
- **Second view.** Run `control-sora mcp get_overview`. The payload holds `"income": 5000`, `"expenses": 1900.5`, and `"net": 3099.5` — the same numbers the page shows.

## Gotchas

- The range button on a fresh load reads `Nov 10, 2026` (today), not the month. The data behind it is the month. Assert the numbers.
- The date picker offers `Today`, `Yesterday`, `Last 7 Days`, `Last 14 Days`, `Last 30 Days`, `This Week`, `Last Week`, `This Month`, and `Last Month`. A range longer than 90 days is refused with a toast.
- Amounts are formatted for the household's currency, so `$5,000` has no decimals while `$320.50` does. A whole amount drops the `.00`.
- Category breakdowns hide the `Settlement` category: a settlement moves money between members, it is not spending.
- The category lists show every category of that type, with the ones that have no transactions in the range at `$0`.
- The history chart is a canvas, so `snapshot` will not show its bars. Assert the chart's presence and the surrounding controls, not its pixels.
- Personal transactions are excluded from the totals, the category breakdowns, and the shared spending card.
