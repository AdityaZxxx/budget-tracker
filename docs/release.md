# Releasing to production

Production is the Vercel deployment on the team's Vercel account, backed by the Neon Postgres database. Releases are deliberate: merging to `main` never deploys. Publishing is a manual run of the Release workflow, so the thing that ships is the commit on `main` you picked, after the same checks CI runs.

## One-time setup

In the GitHub repo, create a `production` environment and put your approval on it (required reviewers). Add:

- Secret `PRODUCTION_POSTGRES_URL_NON_POOLING`: the direct (non-pooled) Neon connection string. Migrations use it because poolers break DDL.
- Secret `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`: from the Vercel account and project settings. The deploy step builds the checkout of `main`, not a rolling branch, so what ships is the ref you reviewed.
- Variable `PRODUCTION_BASE_URL`: the production origin, for example `https://budget-tracker-seven-topaz.vercel.app`.

## Cutting a release

1. Check the full product works on a preview deployment or locally against a disposable database. Never verify against production.
2. For any migration that rewrites or drops data, take a Neon branch snapshot first. Additive migrations can go without one.
3. Actions, Release workflow, Run workflow, pick `main`, enter the tag (`v2026.11.11` or semver). Approve the `production` environment when prompted.
4. The workflow applies pending migrations, deploys, smoke tests, tags the commit, and drafts a GitHub release with generated notes. If any step fails, the release stops there; a failed migration or deploy leaves the previous app running, because migrations are additive within a release.

## Rollback

App rollback is a Vercel dashboard action: promote the previous production deployment. Migrations are not reversed automatically, so a schema fix ships as a new forward migration in the next release. If a release ships a bad additive migration, roll the app back only if the old code still reads the new schema correctly; otherwise ship the fix forward.
