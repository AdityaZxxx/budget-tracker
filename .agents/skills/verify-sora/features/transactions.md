# Transactions

The transactions page is the ledger: every income and expense in the household's date range, with filters, a CSV export, and the two ways to change it.

## Sub-features

- `transactions-list` shows one row per transaction with its category, description, author, date, type, and amount.
- `transactions-filter-category` narrows the table to one category.
- `transactions-filter-type` narrows the table to income or expense.
- `transactions-export` downloads the visible range as a CSV.
- `transactions-add` records a new transaction.
- `transactions-delete` removes a transaction after a confirmation.
- `transactions-personal` marks a transaction as personal, so it stays out of the household totals.

## How to get to it (user POV)

- Choose `Transactions` in the top navigation.
- Open `/transactions` directly.
- Add one from the dashboard with the `New expense` or `New income` button.
- Add one from an assistant with the `add_transaction` MCP tool or `sora add-expense` on the command line.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one income and five expenses.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the table.** Run `control-sora browser open http://127.0.0.1:3210/transactions`. The heading reads `Transactions history` and the range reads `Nov 1, 2026 - Nov 10, 2026`.
- **Read the rows.** Run `control-sora browser get count 'tbody tr'`, then `control-sora browser get text body`. Six rows, and the body shows `Salary` `Monthly salary` `+$5,000`, `Rent` `-$900`, `Groceries` `-$320.50`, `Travel` `-$300`, `Utilities` `-$180`, and `Dining Out` `-$200`. Avery's rows say `You`; Blake's rows say `added by Blake Rivera`.
- **Filter by category.** Run `control-sora browser find role button click --name "Category"` (the first `Category` button, the filter above the table, not the column header), then `control-sora browser find role option click --name "🛒 Groceries"`. One row is left, the `Groceries` row, and a `Clear filters` entry appears.
- **Clear the filter.** Run `control-sora browser find role option click --name "Clear filters"`. Six rows are back.
- **Filter by type.** Run `control-sora browser find role button click --name "Type"` (the first `Type` button, the filter above the table), then `control-sora browser find role option click --name "Expense"`. Five rows are left and the `Salary` row is gone.
- **Clear the filter again.** Run `control-sora browser find role option click --name "Clear filters"`. Six rows are back.
- **Export the CSV.** First hook the blob the page creates: run `control-sora browser eval 'window.__csv=null;const o=URL.createObjectURL.bind(URL);URL.createObjectURL=(b)=>{b.text().then(t=>{window.__csv=t});return o(b)};"hooked"'`. Then run `control-sora browser find role button click --name "Export CSV"`, and read it back with `control-sora browser eval 'window.__csv'`. The text starts with `Date,Category,Description,Type,Amount,Currency` and has one line per transaction, including `11/7/2026,Groceries,Weekly groceries,Expense,"$320.50",`.
- **Add a transaction.** Run `control-sora browser find role button click --name "New expense"`, then `control-sora browser find label "Description" fill "Coffee run"`, `control-sora browser find label "Amount" fill "12.50"`, `control-sora browser find role combobox click --name "Category"`, `control-sora browser find role option click --name "Dining Out"`, and `control-sora browser find role button click --name "Create"`. The dialog closes, a `Transaction created` toast appears, and the category combobox reads `Dining Out` while the dialog is open.
- **See the new row.** Run `control-sora browser open http://127.0.0.1:3210/transactions`. Seven rows, and the new row reads `Coffee run`, `You`, `Expense`, `-$12.50`, with no `Via agent` badge.
- **Prove the new row in a second view.** Run `control-sora mcp list_transactions '{"from":"2026-11-01","to":"2026-11-30"}'`. The payload includes the `Coffee run` transaction with `"shared": true`.
- **Add a personal transaction.** Open the dialog again with `control-sora browser find role button click --name "New expense"`, fill the description and amount, pick the category, then uncheck the share with `control-sora browser find role checkbox click --name "Shared with household"` (the checkbox reads `checked=false` afterwards) and choose `Create`. The table shows the row with a `Personal` badge, and `control-sora mcp get_overview` still reads `"expenses": 1913` and `"net": 3087` — the personal $3.50 is not in the household totals, while the shared $12.50 from the step before is.
- **Delete it.** Open the row's actions with `control-sora browser click 'tbody tr:has(button[aria-label="Coffee run"]) td:last-child button'`, then `control-sora browser find role menuitem click --name "Delete"`, then `control-sora browser find role button click --name "Delete transaction"`. A `Transaction deleted` toast appears and six rows are left.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/transactions/table.png` before the mutation, and again after the deletion.

## Gotchas

- The table's column header buttons share their names with the filter buttons above the table (`Category`, `Type`). `find role button click --name "Category"` hits the filter, because the filter comes first in the page; if that ever changes, scope the click with `browser snapshot -i` and a reference.
- The category filter's options carry their icon: the option is `🛒 Groceries`, not `Groceries`.
- In the create dialog, the category picker is a combobox labelled `Category` whose selected value reads `Dining Out` once a category is chosen. Choosing one must not reload or blank the page; if it does, the picker's callback has gone back to running in an effect.
- The share toggle is a checkbox labelled `Shared with household`, checked by default. Click it to make the transaction personal.
- Descriptions are capitalised by the stylesheet, so `Weekly groceries` renders as `Weekly Groceries`. The row's tooltip button keeps the original text and is the stable handle.
- The CSV is built in the browser from the rows that are on screen, so it follows the active range and the active filters. Its amounts are formatted for the household currency and its cells are comma separated.
- The row's action menu is opened with `tbody tr:has(button[aria-label="<description>"]) td:last-child button`. Do not use `tbody tr:last-child`: several rows can share a date, and the table sorts by date, so the last row is whichever transaction happened to be created last.
- The delete confirmation is a separate dialog with a `Delete transaction` button. The row's own menu item only reads `Delete`.
- A transaction added by an assistant shows a `Via agent` badge next to the author.
- A personal transaction is marked `Personal` and belongs to the member who added it; it is excluded from the household totals, the budgets, and the shared spending card.
- The toasts (`Transaction created`, `Transaction deleted`) disappear after a few seconds. Read the page right after the click, and treat the row count as the durable proof.
- A personal transaction is marked `Personal` and belongs to the member who added it; it is excluded from the household totals, the budgets, and the shared spending card.

### The same flow over the CLI and MCP

- `control-sora cli transactions` lists the household's transactions for the current month.
- `control-sora cli add-expense --amount 25 --category "Dining Out" --description "CLI coffee"` records a shared expense; the payload holds the new transaction's id.
- `control-sora mcp list_transactions '{"from":"2026-11-01","to":"2026-11-30"}'` lists the same rows the table shows, with the author and the shared flag.
