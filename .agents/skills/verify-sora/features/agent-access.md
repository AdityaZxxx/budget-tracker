# Agent access

Agent access is the household's switch for programmatic use. When it is on, a member can mint an API token and let an assistant or a script work on the ledger through the MCP endpoint.

## Sub-features

- `agent-access-switch` turns programmatic access on and off for the household.
- `agent-access-tokens` lists the household's active tokens.
- `agent-access-create` creates a token with a name, a scope, and an optional expiry.
- `agent-access-show-once` shows the token's plaintext exactly once.
- `agent-access-revoke` kills a token.
- `agent-access-scope` decides whether a token can read, or read and write.
- `agent-access-kill-switch` revokes every token when the switch is turned off.

## How to get to it (user POV)

- Choose `Manage` in the top navigation; the `Agent access` card sits above the members.
- Open `/manage` directly.
- Create a token with the `Create token` button on that card.
- Use a token with the `sora` command line client, or with any MCP client against `/api/mcp`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): agent access is on, with one read-write token and one read-only token.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the Manage page.** Run `control-sora browser open http://127.0.0.1:3210/manage` and then `control-sora browser eval 'document.body.innerText'`. The `Agent access` card reads `Allow AI assistants and API access` and `2 active tokens.`, and the tokens are listed as `verification read-write` (`Read and write · Avery Quinn`) and `verification read-only` (`Read only · Avery Quinn`).
- **Create a token.** Run `control-sora browser find role button click --name "Create token"`. Run `control-sora browser find label "Name" fill "verification-ui-token"`, then `control-sora browser find role combobox click --name "Access"` and `control-sora browser find role option click --name "Read and write"`, then `control-sora browser find role button click --name "Create token"`. The dialog changes to `Copy your token`.
- **Read the plaintext once.** Run `control-sora browser eval 'document.querySelector("code").innerText'`. The value is the token. Close the dialog with `control-sora browser find role button click --name "Done"`; the plaintext is never shown again, only the name and the scope.
- **Use the token.** Run `control-sora cli balance` with the new token in the environment: `SORA_TOKEN=<token> control-sora cli balance` reads the run's endpoint from `run.env` and prints the balance as JSON.
- **Revoke it.** Run `control-sora browser find role button click --name "Revoke verification-ui-token"`. A `Token revoked` toast appears and the token is gone from the list. Run `SORA_TOKEN=<token> control-sora cli balance` again: it fails with `The Sora server rejected the token. Check the token, and check that the Household has agent access turned on.` and exits non-zero.
- **Turn agent access off.** Run `control-sora browser find role switch click --name "Allow AI assistants and API access"`. A `Agent access turned off` toast appears, the token list disappears, and the seeded read-write token stops working: `SORA_TOKEN=<seeded token> control-sora cli balance` fails with the same message.
- **Turn it back on.** Run `control-sora browser find role switch click --name "Allow AI assistants and API access"` again. The switch is on, but the tokens do not come back: the card reads `No tokens yet.`
- **Restore the baseline.** Run `control-sora reset`, which re-seeds the household with fresh tokens.
- **Second view.** Run `control-sora mcp get_overview`. The payload reads the household's totals, proving the MCP endpoint accepted the token.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/agent-access/manage.png` with the token list on screen.

## Gotchas

- The plaintext token exists only in the `Copy your token` dialog. Read it with `browser eval 'document.querySelector("code").innerText'` while the dialog is open, or it is gone.
- Turning agent access off revokes **every** token in the household, not just the one in front of you. Turning it back on does not restore them. This is deliberate: the switch is a kill switch, not a promise.
- The switch is named `Allow AI assistants and API access` and has the `switch` role.
- The `Create token` button opens the dialog and the dialog's submit button has the same name. Open the dialog first, then click `Create token` again.
- The token list counts only tokens that are not revoked, so a revoked token disappears rather than turning grey.
- A read-only token is not offered the write tools at all. `control-sora mcp --list` with a read-only token shows only `get_overview`, `list_transactions`, `get_balances`, `list_budgets`, `list_goals`, and `list_categories`; calling `add_transaction` with it fails with `MCP error -32602: Tool add_transaction not found`. Check this before turning agent access off, because the kill switch revokes that token too.
- A view-only member can hold a read-only token, but never a read-write one.
- The CLI reads its endpoint from `SORA_URL` and its token from `SORA_TOKEN`. `control-sora cli` sets both from `run.env`; when you test a token that is not the seeded one, pass `SORA_TOKEN` yourself and keep `control-sora`'s endpoint.

### The same flow over the CLI and MCP

- `control-sora mcp --list` lists the tools the token can call.
- `control-sora mcp get_overview` is a read-only call that proves the token works.
- `control-sora mcp add_transaction '{"amount":25,"category":"Dining Out","type":"expense"}'` needs a read-write token.
- `control-sora cli balance` and `control-sora cli transactions` are the CLI's read commands; `control-sora cli add-expense --amount 25 --category "Dining Out"` is its write command.
