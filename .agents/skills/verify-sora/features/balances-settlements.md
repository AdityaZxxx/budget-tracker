# Balances and settlements

Balances answer who owes whom relative to the caller. They are net of shared expenses and settlements; a settlement records one member paying another member back. No money moves inside the app.

## Sub-features

- `balances-list` shows the net amount between the caller and every other member.
- `balances-direction` says who owes whom and by how much.
- `balances-shared-spending` shows what the household spent together for the picked month.
- `balances-settlement` records that the caller paid another member back.
- `balances-personal` settlements are personal transactions against the caller; they do not count towards household totals or budgets.
- `balances-simplify` the fewest transfers that settle every member (listed only for three or more members).
- `balances-settlements-category` settlements are booked against the system `Settlement` category and excluded from category stat and budget progress.

## How to get to it (user POV)

- The `Balances` card sits on the dashboard; the `Record settlement` button opens the dialog.
- The `Simplify debts` card sits below Balances; it only renders for three or more members.
- Record a settlement from the dashboard.
- Record one from an assistant with the `record_settlement` MCP tool.
- Read balances via the `/api/balances` route or `control-sora mcp get_balances`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two members, two months of shared expenses, one settlement already recorded? no — settlements are seeded; verify on instance or use the verify-sora fixture.
- The browser is signed in as `blake@sora.test` (`control-sora login --as member`).

- **Open the dashboard.** Run `control-sora browser open http://127.0.0.1:3210/`. The `Balances` card reads `You owe $870.25`.
- **Record a settlement.** Run `control-sora browser find role button click --name "Record settlement"`. The combobox lists the other members; fill `Amount` `100`, click `Record`. The toast reads `Settlement recorded`.
- **See the change.** Reload; the card reads `You owe $770.25`. The transaction in `/transactions` shows `Settlement With Avery Quinn` with a `Personal` badge.
- **MCP.** Run `control-sora mcp get_balances`; assert `balance` for avery is `-870.25` and `status` reads `they_owe_you`.
- **Clean up.** Delete the settlement transaction through the row actions on the transactions page. The card returns to `You owe $870.25`.
- **Proof.** `control-sora browser screenshot <artifact-dir>/balances/card.png` and `browser snapshot -i`.

## Gotchas

- The shared-spend card and the `Balances` card soft-show different things: one tracks all shared expenses, the other the net of who owes whom.
- Settlements are `shared: false` transactions with category `Settlement`; personal payees see them, and they do not appear in the household totals or budgets.
- The card is only shown on a household with 2+ members; a solo household never sees it.
- A stale cache can show an older number for up to one poll interval after a settlement.
- MCP `get_balances` signs the other member's balances from the caller's perspective: negative means that member owes the caller.
