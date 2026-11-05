# Sora is free forever and runs on free tiers only

The product has no subscription, no ads, and no required revenue. The only accepted revenue is an optional donation link. Infrastructure is restricted to free tiers (Vercel hobby, Neon free, Resend free at 100 emails/day) so the project costs nothing to run indefinitely. The public launch happens on the existing Vercel URL with a landing page; a custom domain may be added later.

## Considered Options

- Strictly zero revenue, no donation link (rejected): a tip link is harmless and offsets costs if they ever appear.
- Sponsorships or ads later (rejected for now): they would change UX and trust; can be revisited, but not planned.

## Consequences

- Public launch waits until the full product (shared ledger, splits, goals, budget limits) is done; friends and family try it in between.
- Features must stay within free-tier limits: email is used only for auth (verification, password reset) and an optional digest, never for invites, so volume stays far below the Resend ceiling.
- Hosting remains on the operator's Vercel + Neon accounts, with in-app account deletion, full data export, and a short privacy policy as the trust guarantees.
