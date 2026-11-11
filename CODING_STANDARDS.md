# Coding Standards

These are the judgement calls this repo makes. Mechanical rules (where a file lives, what a function is called) belong in the linter rather than here, because a check fails loudly and prose drifts silently. The product also runs on free tiers only (`docs/adr/0002-free-forever-zero-cost.md`), so a diff that needs a paid service is a finding.

## Household scope is the authorization model

Authorization is membership, not ownership. Resolve the caller's Household first, then scope every read and write by `householdId`.

Attribution and visibility are different questions. A transaction records the member who added it (`addedById`), and that member can leave the household without their transactions disappearing. So "who added it" never answers "who can see it", and only the household does.

There is no owner. Full members can all edit or delete any transaction, invite others, and remove others; view-only members can do none of those. A diff that adds an owner check is a finding.

A reviewer should be able to point at the `householdId` filter in every query the diff touches. A query that filters by `addedById` where the intent was "in this household" is a bug even when it returns the right rows today.

## Shared and personal are two ledgers

`shared: true` counts toward household totals, budgets, and history rollups. `shared: false` is visible only to the member who added it and stays out of all three. Settlements are personal.

Two filter shapes cover the whole codebase, and each is for one purpose:

- **Household aggregate** (totals, category stats, budget spend): `shared: true` only.
- **Member view** (transaction history, export): `shared: true` plus the caller's own, as `OR: [{ shared: true }, { addedById: userId }]`.

When a diff adds a query, decide which of the two it is before writing the filter. An aggregate that forgets `shared: true` leaks one member's private spending into a shared number. A member view that filters on `shared: true` alone hides the caller's own personal rows.

## Rollups move with the transaction

`MonthHistory` and `YearHistory` are denormalised counters that the dashboard reads instead of scanning transactions. Creating or deleting a shared transaction updates them in the same `prisma.$transaction`, incrementing or decrementing the matching month. Personal transactions leave them alone, because they were never counted.

A diff that writes a shared transaction without touching the rollups passes every type check and silently corrupts the dashboard. Check the pair: transaction write, rollup write, same transaction, same `shared` condition.

## Dates are UTC

Transaction dates are stored as UTC (`dateToUtcDate`) and rollup buckets use the UTC getters, so a transaction's month is its UTC month. Budget months follow the same calendar (`monthRangeFor`).

Mixing local-time getters into a bucket key files a transaction under a different month than the one the rollups counted. Use the UTC getters for any date that names a bucket.

## Money is formatted through the household currency

The household holds one currency. Format amounts with `getFormatterForCurrency(household.currency ?? "USD")`; it picks the locale from the currency and drops the decimals on whole amounts.

A diff that formats an amount inline, or hardcodes a currency, breaks a household whose currency is not USD.

## Budgets are soft or hard, per budget

A budget is a monthly limit on one category. `soft` warns at 80% and 100%; `hard` rejects the transaction that would take the month over the limit. The mode is a property of the budget, not a global setting.

Budgets apply to shared expenses only. Settlements are excluded from budget spend, because a settlement is not spending. The threshold check reads the month's spend before the transaction lands, so adding one recomputes rather than double counts, and one transaction produces at most one notification, for the highest threshold it crossed.

## Writes are actions, reads are routes

Mutations are server actions, so the household check runs inside the same call as the write, with no second entry point to forget. Reads are `GET` routes, so the client can poll them and the UI stays live without a websocket.

A diff that adds a mutation should land as an action with the household check inside it. A diff that adds a query should follow the polling pattern its neighbouring queries already use, and a diff that mutates data should invalidate the query keys it affects.

## Every surface reaches the same seam

Sora has three surfaces: the web app, the MCP endpoint, and the CLI. The CLI is a thin MCP client, so the surfaces that carry the rules are the web app and the MCP endpoint, and both must reach the same `lib/` functions. The web app reaches them through server actions and `GET` routes; the MCP endpoint reaches them through the tools in `lib/mcp/`.

A rule that lives only in a server action is a rule an agent walks past, because agents drive the MCP endpoint. When a diff changes how money is read or written, it decides what happens on both paths. The seam is `lib/`, and the transports stay thin: a server action and an MCP tool decode their input, call one `lib/` function, and map the error.

The `lib/` function owns the rule. It validates the write it performs, and a transport's schema is a coarse filter that produces a usable error, not the rule itself. A rule written in one transport and missing from `lib/` is a rule the other transport does not have, and a rule the two transports spell differently is drift until someone says the difference is deliberate.

A helper is extracted when it names a concept. A single-use expression stays where it is used.

## Complexity needs a reason

Before a diff adds a check, a branch, a flag, or a layer for a race or an edge case, it names three things: the concrete failure, how likely it is, and what the complexity costs. A human agrees with those three before the complexity lands. A defensive branch that cannot name a failure is scope the diff did not need.

If a rule in this file fights the task in front of you, say so and get a human sign-off before breaking it. A rule here is a default, not a wall.

## Safety

Four rules protect the people whose money this app holds. They are one line each in `AGENTS.md` because they apply to every task, including the ones that touch no product code. This is what they mean and how to comply.

**Kill only what you started.** A dev server, a Postgres container, and a browser session all outlive the command that started them. Record the PID when you start a process and stop it by that PID. Matching on a name, a path, or a worktree string kills a sibling worktree's server, and `pkill -f` and `pgrep | kill` do it by pattern. The output looks identical either way, so the mistake is invisible from the terminal.

**Disposable databases only.** A verification run starts its own Postgres container (see the `verify-sora` skill). A database holding a real household's data is not a fixture, and a migration pointed at one is not a test.

**No machine-specific addresses in committed code.** A host, a port, and a secret belong in config or env. The documented local-dev defaults are the exception: `BETTER_AUTH_URL` in `.env.example`, the `NEXT_PUBLIC_SITE_URL` fallback in `app/layout.tsx`, and `DEFAULT_ENDPOINT` in `packages/sora-cli`. Anything else hardcoded is one developer's machine leaking into the repo.

**Invented households.** Tickets, commits, messages, and screenshots use households, names, and amounts that exist nowhere. The verification fixture household (`avery@sora.test`, `blake@sora.test`) is the shape: `.test` addresses, invented names, round numbers.

## Documentation

Documentation is for a decision and its reason, or a constraint that spans components. It is not a feature list, a field reference, or a record of what a diff did; the code and the tests already hold those.

A change that makes existing guidance inaccurate updates that guidance in the same change. When a documented decision changes, the affected text is rewritten or removed, not appended to. A new document needs a reason to exist that the code cannot carry.

Plans, research notes, and scratch files are not committed. `.scratch/` is gitignored for that reason.

## Copy reads plainly

Product copy is plain. A period, a comma, a colon, or parentheses where a dash would go, and no em dash in anything a user or an agent reads. The app should read like a person wrote it.

## A money diff walks a checklist

Before a diff that reads or writes money is called done, point at each of these:

1. Every query filters by `householdId`.
2. The filter is one of the two shapes: household aggregate, or member view.
3. A shared transaction write moves the matching `MonthHistory` and `YearHistory` in the same `prisma.$transaction`.
4. Any date that names a bucket uses the UTC getters.
5. Any amount is formatted with `getFormatterForCurrency`.
6. A mutation is a server action with the household check inside it; a read is a `GET` route.
7. The mutation invalidates the query keys its change affects.
8. Both paths reach the change: the web action and the MCP tool.

Nothing here is new. It is the sections above gathered into the order a reviewer reads them, and a diff that fails one item is a finding. The checklist does not replace reading the diff.

## Types are inferred

Let the checker infer a type wherever it can. Annotate only where inference fails or where the type is the contract between two modules. `any` and `unknown` are not contracts. A caught error is the exception, and it is named `cause`. A boundary that receives an unparsed value parses it and names the type that comes out.

## Comments are a last resort

The default is none. A comment explaining what the code does is proof the code failed to say it itself: rename the symbol, extract the function, add a type, or restructure until the intent is obvious without prose. A surprise in our own code is the code's problem, not the reader's, and a comment is not the fix.

Five things survive. A legal or licence header. A non-obvious behaviour forced by an external dependency, platform, vendor, or protocol we cannot reshape. A `prettier-ignore`. A doc comment that defines a public API contract. A link to an issue or RFC for a constraint code cannot express.

Everything else dies, including the long justification: length is a confession, not a credential. When a rule here and a comment disagree about which is load-bearing, the comment loses.

The same bar governs suppressions. Look up the rule an `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` silences. If it catches a real bug or protects correctness, remove the suppression and fix the code. A suppression survives only when the rule itself is faulty, pedantic, or style-only.

## Verify before committing

The working tree must pass the same checks CI runs. `pnpm run verify` is the source of truth for which checks those are.

The repo has no test suite, by decision (`docs/ROADMAP.md`). The build is the safety net for what compiles; behaviour is proved separately, by running the app.

Lint and format are mechanical, and the tools own them: `oxlint` reports the rules, `oxfmt` decides the layout. Run `pnpm lint` and `pnpm fmt` before committing, and let the formatter rewrite the file rather than hand-tuning whitespace or import order.

The rules that belong to the linter live in `packages/sora-lint-plugin`, so a rule that is mechanical is a rule there rather than a paragraph here.

A pre-commit hook runs these on every commit: it formats the staged files, then runs `pnpm run verify`. The build stays in CI, because it is the slow one.

A rule that fires on correct code gets fixed in the code, or, with a stated reason, in `.oxlintrc.json`. A scoped suppression comment is the last option, and only under the bar in "Comments are a last resort".

## Prove behaviour, do not assert it

A behaviour change is not finished until it has been seen running. Use the `verify-sora` skill to drive the real app against a disposable database and capture the run: the command, the value that came back, the side effect. Reading the source proves what the code says, not what the app does, and a green build does not see a hard budget refuse a transaction.

The skill's own rule holds here: never edit product code during a verification run. A behaviour that no longer matches the feature map is a finding to report, not a defect to patch mid-run.

## Commit protocol

One commit per ticket, on the branch the ticket is worked on. Conventional Commits: a type, a short subject, no body, no implementation chatter. The subject says what changed, not what you did.

Formatting is the one split. The formatter's commit is mechanical and lands on its own, so a reviewer can skip it and read the change underneath.

A ticket worked in the main session is committed after the session has read its own diff, and before the review a pull request carries. A ticket worked by a subagent commits on its own branch, because concurrent commits on one branch collide. A stack of branches wants a worktree each, so two of them cannot fight over the same checkout.

## Pull requests

A pull request is the end of a ticket, not a favour. One concern carries one pull request, and tickets that serve the same concern travel together. A pull request that will be merged into a branch other than `main` is stacked on the one below it, and the stack merges from the bottom.

The agent that worked the ticket commits and pushes the branch. A reviewer reads the diff after it is pushed, against the ticket's desired outcome, and the pull request opens once that review is clean. The order is commit, push, review, open.

The body says the problem in a sentence or two, then how it was fixed, then the evidence: the commands that ran and what they printed, and the run that drove the app. A behaviour change that was not seen running has no evidence, and the body says so rather than claiming otherwise. It ends with `## Merge Danger`, a `**Door:**` line and a `**Blast Radius:**` line.

A visual change carries a before and after capture. The capture is uploaded to the pull request, never committed to the repository.

## Keeping this file honest

When a rule here contradicts the code, the code is what ships, so fix this file in the same change. When a rule here contradicts an ADR, surface the conflict rather than quietly picking one.
