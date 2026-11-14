# Sora verification map

This directory is the maintained source for verifying Sora's user-facing behaviour. Read the index, then use the matching feature file as the recipe.

## Baseline preconditions

- Sora is launched by the harness, never by hand: `.agents/skills/verify-sora/scripts/control-sora launch`. That command owns the database, the port, and the fixtures.
- The instance is disposable: its Postgres container, its volume, and its certificate live for one run and are removed by `control-sora stop`.
- The seeded household has two members (Avery and Blake), one `USD` household, six transactions in the current month, one soft budget, and one goal. `control-sora reset` puts it back exactly like that.
- `control-sora doctor` passes before the first drive and after any drive that failed in a way that could have left the browser or the app in an odd state.
- Never drive an instance that this run did not start.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer accessible names over CSS selectors: `find role button click --name "New expense"`. Reach for a CSS selector only where two elements share a name (the transaction table's `Category` filter and its `Category` column header), and say so.
- Keep commands literal. Quoted names and flags stay unchanged.
- Run browser actions through `control-sora browser`, so every command in a run shares one browser session and one cookie jar.
- Run terminal actions through `control-sora cli <command>` and tool calls through `control-sora mcp <tool> '<json>'`; both read this run's endpoint and token from `run.env`.
- Restore the seeded data after a mutation (`control-sora reset`), and never delete proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an interactive snapshot (`browser snapshot -i`) and a screenshot with the app identity visible.
- CLI proof includes the command, the stdout, and the exit code.
- MCP proof includes the tool name, the arguments, and the returned payload.
- A mutation is only proven when a second, read-only view shows the new value (`browser get text body`, `mcp get_overview`, `cli balance`).
- Record the feature id and the entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behaviour. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short ids with one line for each behaviour.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with agent-browser` starts with `Preconditions:` and uses labelled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Onboarding](./onboarding.md) covers signing up, the currency wizard, and the first empty dashboard.
- [Overview](./overview.md) covers the dashboard's totals, its category breakdowns, the shared spending card, and the history chart.
- [Transactions](./transactions.md) covers the transaction table, its filters, the CSV export, and adding and deleting a transaction.
- [Budgets](./budgets.md) covers creating, editing, and deleting a budget, its progress, and the hard limit.
- [Goals](./goals.md) covers creating and deleting a goal and tracking contributions towards it.
- [Balances and settlements](./balances-settlements.md) covers who owes what, recording a settlement, and the shared spending card.
- [Manage](./manage.md) covers the space name, invite links, members, digest, export, and account deletion.
- [Agent access](./agent-access.md) covers the agent access switch, API tokens, and what a token can and cannot do.
- [Validation](./validation.md) covers rejected input at every entry point: the web form, the MCP surface, and the CLI.
