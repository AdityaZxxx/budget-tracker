# Onboarding

Onboarding is how a brand new member gets a usable ledger: they sign up with an email and a password, pick a currency on the wizard, and land on an empty dashboard that already belongs to them.

## Sub-features

- `onboarding-signup` creates an account from the sign-up form and opens the wizard.
- `onboarding-currency` picks the household's currency on the wizard.
- `onboarding-dashboard` sends the member to their own empty dashboard.
- `onboarding-household` gives the new member a household of their own, with no transactions.
- `onboarding-signin` signs a returning member back in and drops them on the dashboard.

## How to get to it (user POV)

- Choose `Sign up` on the sign-in page and fill the form.
- Open `/sign-up` directly.
- Choose `Sign in` on the sign-in page and fill the form.
- Open `/sign-in` directly.
- A signed-in member without a currency lands on `/wizard` instead of the dashboard.

## Driving it with agent-browser

Preconditions:

- The run is on an empty database: `.agents/skills/verify-sora/scripts/control-sora reset --empty`. The seed is skipped, so nothing exists yet.
- `control-sora doctor` passes.
- The browser session is signed out (the reset deleted the previous session).

- **Open the sign-up form.** Run `control-sora browser open http://127.0.0.1:3210/sign-up`. A `Name`, `Email`, and `Password` textbox and a `Sign up` button appear.
- **Fill the form.** Run `control-sora browser find label "Name" fill "Casey Morgan"`, `control-sora browser find label "Email" fill "casey@sora.test"`, and `control-sora browser find label "Password" fill "sora-verify-pass"`.
- **Create the account.** Run `control-sora browser find role button click --name "Sign up"`. The browser lands on `/wizard` and the heading reads `Welcome, Casey! 👋`.
- **Pick a currency.** Run `control-sora browser find role button click --name "Select currency…"`, then `control-sora browser find placeholder "Filter currency…" fill "USD"`, then `control-sora browser find role option click --name "🇺🇸 United States Dollar"`. The trigger now reads `🇺🇸 United States Dollar`.
- **Finish.** Run `control-sora browser find role button click --name "I'm done! Take me to the dashboard"`. The browser lands on `/`, the heading reads `Hello, Casey! 👋`, and the stats read `$0` for income, expense, and balance.
- **Proof.** Run `control-sora browser snapshot -i` and `control-sora browser screenshot <artifact-dir>/onboarding/dashboard.png`. The screenshot shows the empty dashboard with the `Invite a Member` prompt.
- **Sign back in.** Open the user menu with `control-sora browser find role button click --name "Open user menu"`, choose `Sign out` with `control-sora browser find role menuitem click --name "Sign out"`, then run `control-sora browser open http://127.0.0.1:3210/sign-in`, fill `casey@sora.test` and `sora-verify-pass`, and choose `Sign in`. The browser lands on `/` with the same empty dashboard.
- **Restore the baseline.** Run `control-sora reset` so the next feature starts from the seeded household.

## Gotchas

- Onboarding only works on an empty database. `control-sora reset` re-seeds; `control-sora reset --empty` is the one that gives a virgin instance.
- The wizard's currency option is `🇺🇸 United States Dollar`, not `US Dollar`. Filtering the list by `USD` is the reliable way to find it.
- The sign-up form's password field needs at least 8 characters, and the email has to look like an email address. Both rules are checked on submit.
- `control-sora login` only signs in the seeded members. A brand new member has to be driven through the form, as above.
- The dashboard's date-range button reads `Nov 10, 2026` (today) on a fresh household even though the range is the whole month. Assert the numbers, not the button label.
- After `reset` or `reset --empty`, the browser's session cookie points at a deleted session. Sign in again before driving.
- The auth pages show the Sora mark, not a link home: the dashboard is out of reach while signed out, and prefetching it would cache the sign-in redirect under the dashboard route.
