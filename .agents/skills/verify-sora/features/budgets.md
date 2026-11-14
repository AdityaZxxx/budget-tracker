# Budgets

A budget is a per-category monthly limit with two modes. A soft budget warns at the limit; a hard budget refuses the write before the transaction reaches the ledger.

## Sub-features

- `budget-soft-create` a member can create a soft budget; the card shows `0%` used after creation.
- `budget-soft-progress` the card shows how much of the month's shared expenses have been spent in the category.
- `budget-soft-warning` a soft budget that is exceeded notifies the other members at the threshold they cross.
- `budget-hard-create` a member can create a hard budget; a hard limit is enforced at the seam.
- `budget-hard-reject` a transaction over the limit is refused with the remaining budget; no row is created.
- `budget-edit` a member can raise or lower the limit or switch mode.
- `budget-delete` a member can delete the budget; spent-vs-limit is no longer tracked; historical transactions stay.
- `budget-member-edits` a full member can manage all budgets in the household; a view-only member can only see them.
- `budget-shared-only` a personal transaction does not count toward any budget.
- `budget-settlements-excluded` a settlement does not count toward any budget.

## How to get to it (user POV)

- Choose `Manage` in the top navigation, then scroll to the `Budgets` card.
- Read progress on the `Budgets` cards in that page.
- Set a category budget here or let an assistant do it with the `set_budget` MCP tool.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one soft budget (Groceries, $500, 320.50 spent), one goal.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open http://127.0.0.1:3210/manage`. The heading reads `Manage`.
- **Read the existing budget.** Assert the Groceries card reads `Groceries`, `$320.50 of $500 spent · $179.50 remaining · 64%`.
- **Create a hard budget.** Run `control-sora browser find role button click --name "Create budget"`, then `control-sora browser find role combobox click --name "Category"`, `control-sora browser find role option click --name "Utilities"`, `control-sora browser find label "Monthly limit" fill "100"`, `control-sora browser find role combobox click --name "Mode"`, `control-sora browser find role option click --name "Hard (block expenses over the limit)"`, and `control-sora browser find role button click --name "Create"`. The new card reads `Utilities`, the badge reads `Hard`, `100%` used already (the seeded `Electricity And Water` expense is $180).
- **Trigger the hard rejection.** Run `control-sora browser open http://127.0.0.1:3210/` then `New expense`, fill description `Utility spike` and amount `150`, pick `Utilities`, and click `Add`. The toast reads `Hard budget exceeded for Utilities: the monthly limit is $100 and $180 is already spent, so this $150 expense would bring the month to $330.`
- **The write did not happen.** The transaction table still reads 6 rows; the Utility spike is absent.
- **Clean up.** Delete the Utilities budget via the card's actions menu (`Open actions for Utilities budget` → `Delete` → `Delete budget`).
- **Proof.** Run `control-sora browser screenshot <artifact-dir>/budgets/manage.png`.

## Gotchas

- The manage card cannot create a budget for the `Settlement` category; the seeded UI-only excludes it. Only a full member can create or delete a budget.
- The card shows the progress bar only when the budget is for this month; budgets reset each month.
- A budget overspend only notifies the other members once per transaction, at the highest threshold crossed; the actor is not the only audience.
- The hard-cap rejection toast shows the exact remaining cap from the server; the string is derived, not a constant.
- Utility budget is an example in this recipe; use another category if you reseed.
