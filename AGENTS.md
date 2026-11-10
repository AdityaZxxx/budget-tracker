# AGENTS.md

Sora is a free finance app for couples and households: one shared ledger per Household, with budgets, goals, and balances.

## Agent skills

### Issue tracker

Tickets are local markdown files under `.scratch/<feature>/`, one file per ticket, worked blockers-first. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

### Verification

Drive the real app instead of asserting from the source. The `verify-sora` skill runs the web UI, the CLI, and the MCP endpoint against a disposable database. See `.agents/skills/verify-sora/SKILL.md`.

## Coding standards

The judgement calls this repo makes, plus the commit protocol. Read before reviewing a diff or committing, and read the sections you need before changing how money is read or written. See `CODING_STANDARDS.md`.

## Safety

- Kill only what you started. Never `pkill -f`, `pgrep | kill`, or kill a PID found by matching a name, path, or worktree string.
- Never point a dev server, a migration, or a script at a database that holds a real household's data.
- Never bake one machine's addresses into committed code: no hardcoded `localhost` URLs, origins, ports, or secrets in source, config, or `.env.example` beyond obvious placeholders.
- Keep real household data out of the repo. Tickets, commits, messages, and captures use invented households, names, and amounts.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
