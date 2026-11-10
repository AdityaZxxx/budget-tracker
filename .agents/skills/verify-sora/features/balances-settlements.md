# Balances and settlements

Balances answer one question: who owes whom. A settlement is the record that one member paid the other back; no money moves inside the app.

## Sub-features

- `balances-list` shows the net amount between the caller and every other member.
- `balances-direction` says who owes whom, not just how much.
- `balances-shared-spending` shows what the household spent together this month.
- `balances-settlement` records that the caller paid another member back.
- `balances-settlement-personal` keeps a settlement out of the household totals.
- `balances-simplify` shows the smallest set of transfers that settles the household (three members or more).

## How to get to it (user POV)

- The `Balances` card sits on the dashboard, below `Overview`.
- Choose `Record settlement` on that card.
- Open `/` directly and scroll to `Balances`.
- Record one from an assistant with the `record_settlement` MCP tool.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): Blake owes Avery 870.25.
- The browser is signed in as `blake@sora.test` (`control-sora login --as member`), because a settlement is recorded by the member who paid.

- **Read the balance from Blake's side.** Run `control-sora browser open http://127.0.0.1:3210/` and then `control-sora browser eval 'document.body.innerText'`. The `Balances` card reads `Avery Quinn` and `You owe $870.25`.
- **Read the shared spending card.** The same output shows `Shared spending this month` and `$1,900.50`, with `$1,900.50 more than last month ($0)`.
- **Record a settlement.** Run `control-sora browser find role button click --name "Record settlement"`. The dialog reads `Record a settlement`. Run `control-sora browser find role combobox click --name "Member"`, then `control-sora browser find role option click --name "Avery Quinn"`, then `control-sora browser find label "Amount" fill "100"`, then `control-sora browser find role button click --name "Record"`. A `Settlement recorded` toast appears.
- **Prove the new balance.** Run `control-sora browser open http://127.0.0.1:3210/` again. The `Balances` card now reads `You owe $770.25`.
- **Prove the settlement is a personal transaction.** Run `control-sora browser open http://127.0.0.1:3210/transactions` and then `control-sora browser eval 'document.body.innerText'`. The new row reads `Settlement`, `Settlement With Avery Quinn`, `Personal`, `Expense`, `-$100`. It is marked `Personal`, and the household's totals are unchanged: run `control-sora mcp get_overview` and the payload still reads `"expenses": 1900.5`.
- **Undo it.** Open the settlement's row actions with `control-sora browser click 'tbody tr:has(button[aria-label="Settlement with Avery Quinn"]) td:last-child button'`, then `control-sora browser find role menuitem click --name "Delete"`, then `control-sora browser find role button click --name "Delete transaction"`. Run `control-sora browser open http://127.0.0.1:3210/` and the balance reads `You owe $870.25` again.
- **Read the balance from Avery's side.** Sign out with `control-sora browser find role button click --name "Open user menu"` and `control-sora browser find role menuitem click --name "Sign out"`, then run `control-sora login`. The card reads `Blake Rivera` and `Blake Rivera owes you $870.25`.
- **Second view.** Run `control-sora mcp get_balances` as Avery. The payload holds `"memberName": "Blake Rivera"`, `"balance": -870.25`, and `"status": "they_owe_you"`.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/balances/dashboard.png` with the balance card on screen.

## Gotchas

- The balance is relative to the member who is looking. Avery sees `Blake Rivera owes you $870.25`; Blake sees `You owe $870.25` for the same debt. Assert the wording, not just the number.
- A settlement records that **the caller paid the other member**. Blake pays Avery to shrink the debt; Avery paying Blake grows it. Driving the settlement from the wrong member moves the number the wrong way.
- A settlement is a personal transaction of the payer. It shows up in the payer's own transactions list, marked `Personal`, and it never touches the household totals or the budgets.
- A settlement is hidden from the `Settlement` category in the category pickers and the category breakdowns.
- The settlement row is found by its description, `Settlement with Avery Quinn`, not by its position: the table sorts by date and several rows can share one.
- The `Record settlement` button is disabled while there is nobody to settle with, and the card says `No other members yet` for a solo household.
- The MCP payload signs the balance the other way round from the page: `-870.25` with `"status": "they_owe_you"` is the page's `Blake Rivera owes you $870.25`. Do not copy the sign across.
- `Simplify debts` only appears with three members or more. The seeded household has two, so it is never on screen.

### The same flow over the CLI and MCP

- `control-sora cli balance` prints the same balance as the card, as JSON.
- `control-sora mcp get_balances` is the read-only second view.
- `control-sora mcp record_settlement '{"memberId":"<Blake's member id>","amount":100}'` records a settlement from an assistant. The member id comes from `control-sora mcp get_balances`.
