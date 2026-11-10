# Upstream

The rules in this package are vendored from two open source projects. Both are
MIT licensed, and both are vendored here with their licence text.

## `rules/no-em-dash-copy.ts`, `rules/no-low-value-comments.ts`

- Source: https://github.com/pingdotgg/t3code, `oxlint-plugin-t3code/rules`
- Licence: MIT, Copyright (c) 2026 T3 Tools Inc.
- Vendored without change to the rule logic.

## `rules/no-manual-memo.ts`, `rules/no-hookless-use-function.ts`, `rules/no-unscoped-has.ts`, `rules/require-suppression-reason.ts`

- Source: https://github.com/pingdotgg/t3code, `oxlint-plugin-t3code/rules`
- Licence: MIT, Copyright (c) 2026 T3 Tools Inc.
- One change: `no-manual-memo` names `useStableCallback`, a helper that does not exist in this repo. The message says to keep one identity only where a child needs it instead.

## `rules/*.ts` (the rest), `shared/*.ts`, `vendor/eslint-stylistic/*`

- Source: https://github.com/dmmulroy/anti-slop, `skills/install-anti-slop/assets/anti-slop`
- Vendored by https://github.com/anomalyco/opencode at commit `c44ef22ca116d0ba62a3ff663a0bd13a3f3fa40b`, whose `script/oxlint/anti-slop/UPSTREAM.md` records the same provenance.
- Licence: MIT, Copyright (c) 2026 Dillon Mulroy.
- `vendor/eslint-stylistic/` carries its own `LICENSE` and `UPSTREAM.md`.

The rules are vendored rather than depended on because oxlint loads a JavaScript
plugin from a path, and the upstream projects publish no package for them.
