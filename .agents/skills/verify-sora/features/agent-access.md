# Agent access

Agent access is the household's switch for programmatic use. When it is on, a member can mint an API token and let an assistant or a script work on the ledger through the MCP endpoint.

## Sub-features

- `agent-access-switch` turns programmatic access on and off for the household.
- `agent-access-tokens` lists the household's active tokens.
- `agent-access-show-once` shows the token's plaintext exactly once.
- `agent-access-revoke` kills a token; `agent-access-revoke-own` for a view-only member.
- `agent-access-scope` decides whether a token can read (7 tools) or read and write (an extra 11 tools).
- `agent-access-kill-switch` revokes every token when the switch is turned off.
- `agent-access-role-gate` a view-only member can hold read-only tokens only.

## How to get to it (user POV)

- Choose `Manage` in the top navigation; the `Agent access` card sits above the members section.
- Open `/manage` directly.
- Create a token with the `Create token` button on that card.
- Use a token with the `sora` command line client or any MCP client against `/api/mcp`.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): agent access is on, with one read-write and one read-only token.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open http://127.0.0.1:3210/manage` and then `control-sora browser eval 'document.body.innerText'`. The `Agent access` card reads `Allow AI assistants and API access` and `2 active tokens.`; the tokens are listed as `verification read-write` (`Read and write · Avery Quinn`) and `verification read-only` (`Read only · Avery Quinn`).
- **Create a token.** Run `control-sora browser find role button click --name "Create token"`. Fill `Name` with `verification-ui-token`, leave `Access` at `Read and write`, set `Expires` to a future date, and submit. The dialog changes to `Copy your token`.
- **Read the plaintext once.** Run `control-sora browser eval 'document.querySelector("code").innerText'`. The value is the token. Close the dialog with `Done`; the plaintext is never shown again, only the name and the scope.
- **Use the token.** Run `control-sora cli balance` with the new token in the environment: `SORA_TOKEN=<token> control-sora cli balance` prints the balance.
- **Revoke it.** Run `control-sora browser find role button click --name "Revoke verification-ui-token"`. A `Token revoked` toast appears and the token is gone from the list. Run `SORA_TOKEN=<token> control-sora cli balance` again: it fails with `The Sora server rejected the token. Check the token, and check that the Household has agent access turned on.` and exits non-zero.
- **Turn agent access off.** Run `control-sora browser find role switch click --name "Allow AI assistants and API access"`. A toast appears, the token list disappears, and the seeded read-write token stops working: `SORA_TOKEN=<seeded token> control-sora cli balance` fails with the same message.
- **Turn it back on.** Run the same switch again. The switch is on, but the tokens do not come back: the card reads `No tokens yet.`
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/agent-access/manage.png` with the token list on screen.

## Gotchas

- The plaintext token exists only in the `Copy your token` dialog. Read it with `browser eval 'document.querySelector("code").innerText'` while the dialog is open, or it is gone.
- Turning agent access off revokes **every** token in the household. Turning it back on does not restore them; the switch is a kill switch, not a promise.
- The switch is named `Allow AI assistants and API access` and has the `switch` role.
- The `Create token` button opens the dialog and the dialog's submit button has the same name. Open the dialog first, then click `Create token` again.
- A read-only token sees 7 tools (`get_overview`, `list_transactions`, `get_balances`, `list_budgets`, `list_goals`, `list_categories`, `list_members`); calling `add_transaction` with it fails. A read-write token adds `add_transaction`, `delete_transaction`, `record_settlement`, `create_goal`, `update_goal`, `delete_goal`, `set_budget`, `delete_budget`, `create_category`, `update_category`, `delete_category`.
- A view-only member cannot create a read-write token (the option is disabled in the dialog) and cannot toggle the switch; the server also enforces it.
- A view-only member clicking `Revoke` on another member's token sees the list unchanged: the server rejects with `View-only members can only revoke their own tokens`.
- While the `/manage` query is loading the switch renders off; wait for the page to settle before reading its state.
