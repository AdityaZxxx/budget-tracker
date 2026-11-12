# Individuals and households are equal personas

Sora is a finance app for individuals tracking their own money and for households sharing a ledger. The two personas get the same product quality: the same features, the same dashboard, the same onboarding shape. Solo is not a degraded mode and not a waiting room for inviting a partner; it is a first-class way to use Sora.

The data model does not change. A solo user already gets a lazy personal Household (ADR 0001) and solo use is the same model as a shared household with one member. This decision changes the product surface, not the schema: UI copy, onboarding, and feature design treat the individual as a full persona alongside the household.

## Rules this creates

- Household-level chrome (the Household switcher, invite-first CTAs) is hidden when the user can reach only one household and is a member of it. Sharing is offered, never pushed.
- The Shared/Personal choice in the transaction dialog does not exist for a one-member household; solo transactions are stored as `shared: true`, so every rollup, budget, goal, and chart works unchanged and stays correct if the user later adds a member.
- Household-only features (Balances, SharedSpendingCard, SimplifyDebts) hide below their member-count threshold, which already holds; new features must ship with a solo path, not a shared-only one.
- When the product needs new shared infrastructure (for example recurring bill definitions), it defaults to household scope like everything else, visible to all members, and stays correct for a one-member household.
- Docs, glossary, roadmap, and the future landing page name both personas. In UI copy, a one-member household is never addressed as a "household".

## Considered Options

- Equal personas with one data model (chosen): solo and sharing are the same code paths with different member counts; the difference lives in copy, visibility rules, and hiding, not in schema or authorization.
- Fork into a separate personal ledger entity (rejected): two authorization paths, two query paths, double the bugs; ADR 0001 already settled this for storage, and nothing about the solo persona requires a different shape.
- Keep solo as a discouraged side effect of the household model (rejected): the lazy personal household existed so sign-up never dead-ends, but treating solo as an accident taxes the solo user with household language and invite-first framing forever.

## Consequences

- Every new feature ticket must state its solo behaviour before its shared behaviour (or both at once); a feature that only makes sense for two or more members must say so in the ticket.
- The glossary still uses Household as the technical term for the shared space, including a one-member one; user-facing copy uses it only where sharing is actually in play.
- The landing page and onboarding, when built, address both personas from the first line.
- Feature parity is verified in review, not by test suite: the running app is the check (Phase 2 decision stands: no test suite).
