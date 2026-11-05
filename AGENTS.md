# AGENTS.md

Sora is a free finance app for couples and households: one shared ledger per Household, with budgets, goals, and balances.

## Agent skills

### Issue tracker

Tickets are local markdown files under `.scratch/<feature>/`, one file per ticket, worked blockers-first. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` plus `docs/adr/`. See `docs/agents/domain.md`.

## Coding standards

The judgement calls this repo makes, plus the commit protocol. Read before reviewing a diff or committing, and read the sections you need before changing how money is read or written. See `CODING_STANDARDS.md`.
