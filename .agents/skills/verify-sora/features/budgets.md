# Budgets

A budget is a monthly limit on one expense category. The Manage page shows how much of the limit is spent, and a hard budget refuses an expense that would break the limit.

## Sub-features

- `budgets-list` shows every budget with its category, mode, and progress.
- `budgets-create` sets a limit and a mode on an expense category.
- `budgets-edit` changes the limit, the category, or the mode.
- `budgets-delete` removes a budget.
- `budgets-progress` shows the spend, the remainder, and the percentage of the limit.
- `budgets-hard-limit` refuses a shared expense that would pass a hard limit.

## How to get to it (user POV)

- Choose `Manage` in the top navigation, then scroll to the `Budgets` card.
- Open `/manage` directly.
- Create a budget from the `Create` button in the `Budgets` card.
- Set one from an assistant with the `set_budget` MCP tool.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): one soft budget, `Groceries`, 500, with 320.50 spent.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the Manage page.** Run `control-sora browser open http://127.0.0.1:3210/manage`. The `Budgets` card is on the page, under `Transaction categories`.
- **Read the budget.** Run `control-sora browser eval 'document.body.innerText'`. The card reads `Groceries`, a `soft` badge, and `$320.50 of $500 spent · $179.50 remaining · 64%`.
- **Edit the limit.** Run `control-sora browser find role button click --name "Open actions for Groceries budget"`, then `control-sora browser find role menuitem click --name "Edit"`. The dialog reads `Edit Groceries budget`. Run `control-sora browser find label "Monthly limit" fill "600"` and `control-sora browser find role button click --name "Save"`. The card now reads `$320.50 of $600 spent · $279.50 remaining · 53%`.
- **Put the limit back.** Repeat the edit and set `Monthly limit` to `500`. The card reads `$320.50 of $500 spent · $179.50 remaining · 64%` again.
- **Create a hard budget.** Run `control-sora browser find role button click --name "Create budget"`. Run `control-sora browser find role combobox click --name "Category"` and `control-sora browser find role option click --name "Utilities"`, then `control-sora browser find label "Monthly limit" fill "100"`, then `control-sora browser find role combobox click --name "Mode"` and `control-sora browser find role option click --name "Hard — block expenses over the limit"`. Run `control-sora browser find role button click --name "Create"` to save the dialog. A second card appears: `Utilities`, a `hard` badge, and `$180 of $100 spent · $0 remaining · 180%`.
- **Prove the hard limit.** Run `control-sora mcp add_transaction '{"amount":150,"description":"Utility spike","category":"Utilities","type":"expense","shared":true}'`. The tool answers `Hard budget exceeded for Utilities: the monthly limit is $100 and $180 is already spent, so this $150 expense would bring the month to $330.` and no transaction is created.
- **Delete the budget.** Run `control-sora browser find role button click --name "Open actions for Utilities budget"`, then `control-sora browser find role menuitem click --name "Delete"`, then `control-sora browser find role button click --name "Delete budget"`. The confirmation reads `Delete budget for "Utilities"?`. Only the `Groceries` card is left.
- **Second view.** Run `control-sora mcp list_budgets`. The payload holds `"category": "Groceries"`, `"amount": 500`, `"mode": "soft"`, `"spent": 320.5`, `"remaining": 179.5`, and `"percent": 64.1`.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/budgets/manage.png` with both budgets on screen.

## Gotchas

- The button that opens the create dialog is named `Create budget`; the dialog's own submit button is named `Create`. They do not collide.
- The budget dialog's limit field is labelled `Monthly limit`, not `Amount`.
- The mode options are `Soft — warn at 80% and 100%` and `Hard — block expenses over the limit`. The em dash is part of the name.
- The card's remaining amount is floored at zero, so an over-budget card reads `$0 remaining` and a percentage above 100.
- The progress is measured over the current UTC month. A budget created mid-month is immediately in progress.
- Only shared expenses count towards a budget. Personal transactions never do.
- A hard budget refuses the transaction; a soft budget only warns, through a notification for the other members.
- The budget card's percentage is rounded to the nearest whole number, while the MCP payload carries two decimals (`64.1`). Assert the same figure in the same place, not across surfaces.

### The same flow over the CLI and MCP

- `control-sora cli budgets` lists the household's budgets with the same progress figures.
- `control-sora mcp set_budget '{"category":"Travel","amount":400,"mode":"soft"}'` sets a budget without touching the UI.
- `control-sora mcp list_budgets` is the read-only second view of the card.
