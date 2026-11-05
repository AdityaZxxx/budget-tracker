# Sora roadmap

Product language lives in [GLOSSARY.md](../GLOSSARY.md); hard-to-reverse decisions live in [docs/adr/](./adr/). Build order: features first; public surfaces (the landing page) wait until the product shape is real. Friends and family test during the build; the public launch on the existing Vercel URL happens only after the feature milestones. Everything stays local until launch.

## Phase 1 - Features

- CI (build + typecheck on push and PR) so every commit stays green
- Rebrand metadata, manifest, and README to Sora
- M1 Shared ledger: Household + Membership schema with household scope on all data, lazy personal Household per new user, invite link + QR + revoke, equal member permissions, attribution kept on leave, UI re-scoped to the household, onboarding with invite CTA, polling refetch (~30s + on focus)
- M2 Splits: shared vs personal transactions, per-pair net balance, settlement recorded as a transaction
- M3 Goals: household target, optional deadline, contribution transactions
- M4 Budgets + notifications: monthly per-category Budget (soft or hard per budget), in-app notification bell + optional email digest

## Phase 2 - Hardening before any real user

- Auth: email verification and password reset via the Resend free tier, email/password primary, Google sign-in optional, Better Auth rate limiting on auth routes
- Account deletion (cascades household data), full JSON/CSV export, /privacy page
- Error monitoring and cookie-less analytics
- No test suite by decision; the CI build is the safety net

## Phase 3 - Launch

- Landing page at `/` on the existing Vercel URL, optional donation link, custom domain later
- Human-only setup: Google OAuth client, Resend key and sender, Vercel env vars, monitoring and analytics keys
