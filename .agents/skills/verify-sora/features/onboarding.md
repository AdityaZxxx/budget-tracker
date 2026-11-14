# Onboarding

The onboarding flow carries a member from sign-up to their first dashboard. Sign-up happens with an email/password or Google; after sign-in the member lands on `/` and the currency gate decides whether to send them to `/wizard` or render the empty dashboard.

## Sub-features

- `sign-up` signs up with email+password or with Google. No verification is required to sign in.
- `sign-in` signs in with email+password or with Google; a signed-in member is bounced from the auth page to their destination.
- `wizard` collects the household currency and sends the member to their (empty) dashboard.
- `first-dashboard` shows an empty ledger and prompts the member to add their first transaction.
- `next-redirect` honours the `next` query parameter for deep links into the app.
- `invite-cta` the member can invite another member for a shared household.

## How to get to it (user POV)

- Open `/sign-up` or `/sign-in`, and choose email/password or `Continue with Google`.
- Follow a `next` parameter to deep-link into an authenticated page.
- The dashboard redirects a currency-less member to `/wizard` until one is picked.
- `I'm done` on the wizard lands the member on their dashboard.
- `Invite a member` shows when the household has exactly one member, and can be dismissed.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The database is empty (`control-sora reset --empty`), so no seeded member exists yet.
- A fresh browser session is open.

- **Sign up.** Run `control-sora browser open http://127.0.0.1:3210/sign-up`, then `control-sora browser find label "Name" fill "Casey Morgan"`, `control-sora browser find label "Email" fill "casey@sora.test"`, `control-sora browser find label "Password" fill "sora-verify-pass"`, and `control-sora browser find role button click --name "Sign up"`. The member lands on `/wizard` and the heading reads `Welcome, Casey! 👋`.
- **Pick the currency.** Run `control-sora browser find role button click --name "Select currency…"`, then `control-sora browser find placeholder "Filter currency…" fill "USD"` and `control-sora browser find role option click --name "🇺🇸 United States Dollar"`. The trigger updates to `🇺🇸 United States Dollar` in place; nothing is saved again when the member leaves this step.
- **To the dashboard.** Run `control-sora browser find role button click --name "I'm done! Take me to the dashboard"`. The member lands on `/`; the heading reads `Hello, Casey! 👋` and the totals are zero.
- **Invite a member.** Run `control-sora browser find role button click --name "Invite a member"`. A dialog describes the invite link; the member can dismiss it or send it. (Only a full member can create an invite link.)
- **Sign out and sign back in.** The member signs out and signs in again on `/sign-in`. The dashboard renders directly; there is nothing saved but the currency, so `Hello, Casey! 👋` still reads and the empty ledger is identical.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/onboarding/sign-up.png` before the currency pick. Restore the seeded baseline with `control-sora reset`.

## Gotchas

- The household row is lazily created on the first read, not at sign-up; the wizard triggers that read, so a member who lands on `/wizard` sees an empty page and a blank currency picker immediately.
- The currency persists the moment it is picked; the `I'm done` button saves nothing extra.
- `/wizard` is session-gated; a signed-out member is bounced to `/sign-in`.
- Sign-up sends a verification email but does not require it; a failed email does not block sign-in.
- A sign-in that succeeds on `/sign-in` pushes the member to `next` (default `/`); a sign-up pushes to `next` (default `/wizard`).
