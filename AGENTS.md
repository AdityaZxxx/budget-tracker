Sora is a free finance app for couples and households: one shared ledger per household, with budgets, goals, and balances.

## Read on demand

Read the one the task names. They do not all need to be read.

- **Tickets** - picking up, writing, or ordering work: `docs/agents/issue-tracker.md`
- **Vocabulary** - naming a domain concept, or a change that might contradict an ADR: `docs/agents/domain.md`
- **Standards** - reviewing a diff or committing: `CODING_STANDARDS.md`
- **Money diff** - changing how money is read or written: "A money diff walks a checklist" in `CODING_STANDARDS.md`
- **Proof** - driving the real app: the `verify-sora` skill (`.agents/skills/verify-sora/SKILL.md`)
- **Map drift** - the verification feature map no longer matches the app: the `maintain-verification-skill` skill (`.agents/skills/maintain-verification-skill/SKILL.md`)

## Safety

- Kill only what you started: stop it by the PID you recorded, not by a name, a path, or a worktree string.
- Dev servers, migrations, and scripts run against a disposable database. Real household data is never a target.
- Committed code holds no machine-specific addresses, apart from the local-dev defaults in `.env.example`, `app/layout.tsx`, and `packages/sora-cli`. Host, port, and secrets live in config or env.
- Invented households: tickets, commits, messages, and captures use names and amounts that exist nowhere.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
