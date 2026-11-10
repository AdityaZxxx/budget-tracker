# Goals

A goal is a savings target for the household. It holds no money of its own: progress comes from transactions tagged with it.

## Sub-features

- `goals-list` shows every goal with its target, its deadline, and its progress.
- `goals-create` sets a name, a target, and an optional deadline.
- `goals-delete` removes a goal.
- `goals-contribution` moves a goal's progress when a transaction is tagged with it.
- `goals-reached` marks a goal that has reached its target.

## How to get to it (user POV)

- The `Goals` card sits on the dashboard, below `Balances`.
- Create one from the `New goal` button on that card.
- Delete one from the bin button on the goal's own row.
- Tag a contribution from the `Goal (optional)` field of the new-transaction dialog.
- Set one from an assistant with the `create_goal` MCP tool.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210` and `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): one goal, `Vacation`, target 2,000, 300 contributed.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the dashboard.** Run `control-sora browser open http://127.0.0.1:3210/` and then `control-sora browser eval 'document.body.innerText'`. The `Goals` card reads `Vacation`, `by June 1st, 2027`, and `$300 of $2,000`.
- **Create a goal.** Run `control-sora browser find role button click --name "New goal"`. The dialog reads `Create a new goal`. Run `control-sora browser find label "Name" fill "Bike"` and `control-sora browser find label "Target amount" fill "800"`, then `control-sora browser find role button click --name "Create"`. The card now holds `Bike` and `$0 of $800`.
- **Delete it.** Run `control-sora browser find role button click --name "Delete goal Bike"`. The confirmation reads `Delete goal "Bike"?`. Run `control-sora browser find role button click --name "Delete goal"`. Only `Vacation` is left, with `$300 of $2,000`.
- **Prove a contribution.** The seeded `Vacation fund` transaction is tagged with the goal. Run `control-sora mcp list_goals`. The payload holds `"name": "Vacation"`, `"target": 2000`, and `"contributed": 300`. Run `control-sora mcp list_transactions '{"from":"2026-11-01","to":"2026-11-30"}'` and look for the `Vacation fund` transaction: it is a normal shared expense, which is why it also shows up in the household's totals.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/goals/dashboard.png` with both goals on screen.

## Gotchas

- The goal dialog's fields are `Name` and `Target amount`; the transaction dialog's amount field is `Amount`. They are different labels for different things.
- The deadline field is optional and opens a calendar. Leaving it empty is fine.
- The delete confirmation's button reads `Delete goal`, and the row's bin button reads `Delete goal <name>`.
- A contribution is a transaction, so it counts towards the household's spending and towards any budget on its category. Tagging a contribution is not free.
- A goal's progress counts shared transactions only. A personal transaction tagged with the goal does not move it.
- A contribution that pushes a goal past its target notifies every member of the household.
- The goal card's progress bar is a canvas-free element, but the figures are text: assert the numbers.
- The dashboard shows the goal's deadline as `by June 1st, 2027`, with the month spelled out.

### The same flow over the CLI and MCP

- `control-sora cli goals` lists the household's goals with the same contributed figure.
- `control-sora mcp create_goal '{"name":"Emergency fund","target":5000}'` creates a goal without touching the UI.
- `control-sora mcp list_goals` is the read-only second view of the card.
