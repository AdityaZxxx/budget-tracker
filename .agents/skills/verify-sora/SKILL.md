---
name: verify-sora
description: "Drive the real Sora app — web UI with agent-browser, the sora CLI, and the MCP endpoint — against a disposable per-run database, and capture proof. Use when you need to prove Sora's behaviour end to end (onboarding, transactions, budgets, goals, balances, agent access) instead of asserting it from the source."
---

# Verify Sora

Sora is a shared finance app: one ledger per household, with budgets, goals, and balances. This skill proves what Sora actually does, in a disposable instance, so a claim about the app is backed by a run rather than by reading the code.

The app has three surfaces and this skill covers all three:

| Surface                     | How it is driven                                |
| --------------------------- | ----------------------------------------------- |
| Web UI (`127.0.0.1:<port>`) | `agent-browser`, through `control-sora browser` |
| CLI (`packages/sora-cli`)   | `control-sora cli <command>`                    |
| MCP (`/api/mcp`)            | `control-sora mcp <tool> '<json>'`              |

The feature map in `features/` is the source of truth for what to drive and what proves each journey. Read the feature file before driving it.

## The rules

- **Drive the real thing.** Sign in through the real form, add transactions through the real UI or the real MCP tool. Never write to the database to make a journey pass, and never assert a number that no surface actually printed.
- **Never edit product code during a verification run.** A behaviour the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it). Both are findings; neither is fixed here.
- **Capture the action and the result.** A screenshot of the final screen proves little. Record the command you ran, the value that came back, and the side effect (a row, a token, a changed total).
- **Leave the instance you found running.** Each run owns its own Postgres and its own port. If something is already running, `control-sora stop` it before starting a new run.

## Launch

```bash
.agents/skills/verify-sora/scripts/control-sora launch
```

`launch` does the whole setup, in order:

1. starts a disposable Postgres 17 container with TLS enabled, on a free port, named after the run;
2. creates `sora_verify_<run-id>` and `sora_verify_<run-id>_shadow` and applies the Prisma migrations;
3. starts Next.js on `127.0.0.1:3210`;
4. builds `packages/sora-cli`;
5. seeds the fixture household (see below) and writes `run.env` and `fixtures.json`.

It prints the URL, the run id, the database name, the artifact directory, and the log file. That output is the handle for everything else.

Why a container and not the Postgres already on the machine: `lib/prisma.ts` connects with `ssl: { rejectUnauthorized: false }`, so the app cannot talk to a server with SSL off. The container is started with `ssl=on` and a throwaway self-signed certificate, so the app connects exactly the way it does in production.

Options:

| Flag         | Effect                                                                      |
| ------------ | --------------------------------------------------------------------------- |
| `--empty`    | Skip the seed. The database is empty, so onboarding can be driven for real. |
| `--prod`     | Build and serve the production bundle instead of the dev server.            |
| `--port <n>` | Serve on another port (default 3210).                                       |

`SORA_VERIFY_MODE=prod` and `SORA_VERIFY_PORT` do the same thing through the environment.

## Doctor

```bash
.agents/skills/verify-sora/scripts/control-sora doctor
```

One read-only pass that answers "is this instance worth driving?". It checks the run state, the app process, the sign-in endpoint, the TLS database, the applied migrations, the Postgres container, that the port belongs to this run, that the CLI can reach MCP, and that `agent-browser` is installed. Run it before the first drive, after any drive that failed in a way that left the browser in a strange state, and after any `reset`.

`--json` prints the same checks as JSON.

## Drive

```bash
CS=.agents/skills/verify-sora/scripts/control-sora

$CS login                 # signs in avery@sora.test through the real form
$CS login --as member     # signs in blake@sora.test
$CS browser <agent-browser args...>   # e.g. $CS browser snapshot -i
$CS cli balance
$CS mcp get_overview
```

`control-sora browser` is `agent-browser` with the run's session (`sora-verify-<run-id>`) already selected, so every command in a run shares one browser and one cookie jar. `agent-browser` itself still works directly; just export the same session name.

`control-sora cli` and `control-sora mcp` read the endpoint and the token from `run.env`, so they talk to this run's instance and nothing else.

`control-sora reset` re-seeds the database in place (use it between journeys). `control-sora reset --empty` empties it, for the onboarding journey.

## The fixture household

Two members share one household with the currency `USD`:

| Member                   | Email             | Password           |
| ------------------------ | ----------------- | ------------------ |
| Avery Quinn (the caller) | `avery@sora.test` | `sora-verify-pass` |
| Blake Rivera             | `blake@sora.test` | `sora-verify-pass` |

Six transactions, all inside the current UTC month so the dashboard's default range and the budget progress agree:

| Date | Description           | Amount | Type    | Category                             | Added by |
| ---- | --------------------- | ------ | ------- | ------------------------------------ | -------- |
| 1st  | Monthly salary        | 5,000  | income  | Salary                               | Avery    |
| 2nd  | Rent                  | 900    | expense | Rent (split: Avery 150, Blake 750)   | Avery    |
| 3rd  | Weekly groceries      | 320.50 | expense | Groceries                            | Avery    |
| 3rd  | Vacation fund         | 300    | expense | Travel (tagged to the Vacation goal) | Avery    |
| 4th  | Electricity and water | 180    | expense | Utilities                            | Blake    |
| 5th  | Dinner out            | 200    | expense | Dining Out                           | Blake    |

Plus one soft budget (Groceries, 500) and one goal (Vacation, target 2,000).

The values every surface must agree on:

| Assertion                 | Value                                          |
| ------------------------- | ---------------------------------------------- |
| Income this month         | 5,000                                          |
| Expenses this month       | 1,900.50                                       |
| Net this month            | 3,099.50                                       |
| Blake owes Avery          | 870.25                                         |
| Groceries budget          | 500 limit, 320.50 spent, 179.50 remaining, 64% |
| Vacation goal             | 2,000 target, 300 contributed                  |
| Transactions in the table | 6                                              |

The rent split is not decorative: it is what makes the balance 870.25 rather than an even split's 570.25. If a journey changes the ledger, restore it with `control-sora reset` before the next one.

`fixtures.json` in `.scratch/verify-sora/` holds the same numbers in machine-readable form, plus the ids of the household, the members, and the goal.

## Evidence

Everything a run proves lives under `.scratch/verify-sora/`, which is gitignored and survives teardown:

```
.scratch/verify-sora/
  artifacts/<run-id>/     screenshots and captured output for this run
  logs/<run-id>.log       the app's own log
  runs/<run-id>.json      what the run was
  fixtures.json           the seeded ids and the expected numbers
  run.env                 endpoint, token, and credentials for the live run
```

Write a short run note at `.scratch/verify-sora/runs/<run-id>.md`: which features were driven, what each one printed, what failed, and the outcome. The note is the part a human reads; the artifacts are the part that proves it.

A proof is good enough when it shows: the action that was taken, the value the surface returned, and the side effect. Screenshots alone are not a proof.

## Cleanup

```bash
.agents/skills/verify-sora/scripts/control-sora stop
```

`stop` ends the app process, closes the browser session, removes the Postgres container, its volume, and its certificate, and writes the run record. The artifacts stay. Confirm they are still there afterwards — a cleanup that eats the proof is a failed run.

Run `stop` after every failed attempt too, so a broken iteration does not strand a port or a container.

## Known defects at this commit

Found by running this skill, and reproducible on `main`:

1. **Adding a transaction from the UI crashes the page.** In the "Create a new expense" dialog, picking a category makes React throw "Maximum update depth exceeded" and the page dies. `CategoryPicker` calls `onChange` from an effect whose dependency is a new function on every render, and the React Compiler does not stabilise it. Reproduces in the dev server and in the production bundle. Adding a transaction through MCP or the CLI works, so the journeys in `features/transactions.md` use that path and report the UI failure as a finding.
2. **Signing in against the production bundle leaves a blank page.** The sign-in request succeeds and the session cookie is set, but the client-side navigation to the dashboard unmounts the page and the URL stays on `/sign-in`. The dev server is fine. `control-sora launch --prod` reproduces it; `control-sora launch` (dev) does not.

## The feature map

`features/README.md` indexes the map. One file per user-facing feature:

| File                               | Covers                                                          |
| ---------------------------------- | --------------------------------------------------------------- |
| `features/onboarding.md`           | Sign up, the currency wizard, the first dashboard               |
| `features/overview.md`             | The dashboard's totals, category stats, and history chart       |
| `features/transactions.md`         | The transaction table, filters, CSV export, adding and deleting |
| `features/budgets.md`              | Budgets on the Manage page, their progress, and the hard limit  |
| `features/goals.md`                | Goals, their progress, and contributions                        |
| `features/balances-settlements.md` | Who owes what, and recording a settlement                       |
| `features/agent-access.md`         | Agent access, API tokens, and what a token can do               |

To add a feature: copy the shape of an existing file, keep the four H2s, and prove the new journey before you commit it.
