# All amounts are stored as a fixed-point decimal

Every amount in the ledger is currently a binary floating point `Float` in the database. A float cannot hold most decimal fractions exactly (`0.1 + 0.2 = 0.30000000000000004`), so a household that splits a bill, sums a category, and settles the leftover can end up off by a fraction of a cent, and the rollups will not match the transactions they came from. Display rounding hides the drift until the numbers are compared. The fix is decided now, before launch, while the app holds no real data.

Money is represented as Prisma's fixed-point `Decimal` throughout: the `Transaction.amount` column and its seven siblings become `Decimal`, and the app never holds an amount as a float. A `Decimal` keeps the meaning of an amount on the wire (`12.50` stays `12.50`) and sums exactly. The migration moves the schema and every arithmetic site to the `Decimal` API; it is its own pull request, not this one.

## Considered Options

- Fixed-point decimal (`Decimal`), chosen: keeps the meaning of an amount everywhere it travels. JSON serializes the string as `"12.50"`, the MCP surface and the export carry the same string the UI does, and no reader ever does the hundred-times scaling in their head.
- Integer minor units (`Int` cents): rejected. It makes every API response carry a number that is not the amount, divides every display and export by 100 in every reader, and signs away the money meaning at every boundary on the way in and out.
- Keep the float, round on display: rejected. The bug this decision exists to kill is hidden drift, and rounding is what hides it.

## Consequences

- Every amount in the schema (`Transaction.amount`, `TransactionShare.amount`, `Budget.amount`, `Goal.target`, `MonthHistory.income`/`expense`, `YearHistory.income`/`expense`) becomes `Decimal` and the generated types change. Every arithmetic site that touches those types stops compiling until rewritten for `Decimal`'s arithmetic API, so `tsc` becomes the migration's checklist rather than a hope.
- `Prisma.Decimal` does not pass through React Server Components: an amount held as an instance cannot be handed to a client component, and JSON emits `toJSON()` (the string form), so API and MCP payloads carry `"12.50"` where they used to carry `12.5`. Client display boundaries parse to a number only for formatting and never do sums on it.
- Comparisons (the hard budget check, the `spentAfter > budget.amount` gate) become `Decimal` comparisons, and the rollup decrements in the transaction delete become `Decimal` arithmetic.
- The migration is explicit and separately reviewed: a single pull request that moves the eight columns, the arithmetic, the wire format, and the display boundaries together, verified against the fixture household before it is trusted with real data.
- The formatter (`getFormatterForCurrency`) and the client components that sum shares remain the display boundary; they convert to `number` at that one place and nowhere else.
