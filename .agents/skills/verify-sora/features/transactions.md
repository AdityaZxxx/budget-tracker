# Transactions

The transactions page is the household ledger. It lists income and expense rows, lets the member filter them, export them as CSV, and create and delete them.

## Sub-features

- `transactions-list` shows one row per transaction with category, description, added-by, date, type, amount.
- `transactions-filter-category` narrows the table to a single category.
- `transactions-filter-type` narrows to income or expense.
- `transactions-export` downloads the visible range as CSV with headers Date, Category, Description, Type, Amount, Currency.
- `transactions-add` opens a dialog to create a new transaction.
- `transactions-delete` deletes a transaction after a confirmation.
- `transactions-paging` lets the member pick rows per page and page through.
- `transactions-clipboard` nothing; visible columns are per-page pickers.

## How to get to it (user POV)

- Choose `Transactions` in the top navigation.
- Open `/transactions` directly.
- Add from the dashboard with the `New expense` / `New income` button.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): 6 transactions, one income and five expenses.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the table.** Run `control-sora browser open http://127.0.0.1:3210/transactions`. The heading reads `Transactions`.
- **Read the rows.** Run `control-sora browser get count 'tbody tr'`, then `control-sora browser eval '[...document.querySelectorAll("tbody tr")].length'`. Six rows. The body shows `Salary` `Monthly Salary` `+$5,000`, `Rent` `-$900`, `Groceries` `-$320.50`, `Travel` `-$300`, `Utilities` `-$180`, `Dining Out` `-$200`. Avery's rows say `You`; Blake's rows say `added by Blake Rivera`.
- **Filter by category.** Run `control-sora browser find role button click --name "Category"` (the filter above the table, not the column header), then `control-sora browser find role option click --name "🛒 Groceries"`. One row left; a `Clear filters` entry appears. Run the same with `Type` → `Expense` → `Salary` goes; five remain.
- **Add a transaction.** Run `control-sora browser find role button click --name "New expense"`, fill `Description` `Coffee run`, `Amount` `12.50`, pick `Dining Out`, click `Add`. Toast `Transaction added`; 7 rows after it.
- **Delete it.** Open the row's actions with `control-sora browser click 'tbody tr:has(button[aria-label="Coffee run"]) td:last-child button'`, then `control-sora browser find role menuitem click --name "Delete"`, and confirm `Delete transaction`. Toast `Transaction deleted`; 6 rows remain.
- **Export CSV.** Hook the blob (`control-sora browser eval 'window.__csv=null;const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{b.text().then(t=>{window.__csv=t});return o(b)}'`), click `Export CSV`, and eval `window.__csv`. The text starts with `Date,Category,Description,Type,Amount,Currency`, has one line per row including `11/12/2026,Groceries,Weekly Groceries,Expense,-$320.50,USD`.
- **Date range.** Click the range button (the Nov 1 - Nov 14, 2026 button) to see the picker. A range wider than 90 days refuses and the toast says the range is too big.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/transactions/table.png` before the mutation, and again after the deletion.

## Gotchas

- The column header buttons (`Category`, `Type`) share their names with the filter buttons above the table. The filter wins on `find role button click --name` because it comes first in the DOM; scope the click with a snapshot ref if the order changes.
- The create dialog only offers `Shared` for households with a second member; solo households never see the checkbox.
- The dialog's `Goal (optional)` select appears only on the expense dialog, and only when at least one goal exists.
- `Delete` is only shown on rows the member can edit (full members only).
- The table re-fetches every 30 s; a row added by this run's MCP call may take 30 s to appear without a manual refresh.
