# Manage

The manage page is the household admin surface: the space name, the agent access switch, members, currency settings, categories, budgets, the privacy/export card, and account deletion.

## Sub-features

- `manage-space-rename` a full member can rename the household.
- `manage-invite-link` a full member can create a revocable invite link or QR code.
- `manage-invite-use` a recipient opens the link, signs in, and is added to the household.
- `manage-agent-access` covered by [Agent access](./agent-access.md); the card sits above the members section.
- `manage-members` lists every member with their role; a full member can change roles.
- `manage-members-leave` a member can leave the household; the last member cannot leave without deleting it.
- `manage-members-remove` a full member can remove a view-only member.
- `manage-members-digest` a member can toggle their own daily email digest.
- `manage-space-currency` the currency set at the wizard; displayed here, not editable.
- `manage-categories` creating, editing, and deleting categories.
- `manage-budgets` see [Budgets](./budgets.md); the card is placed on this page.
- `manage-export` a member can download a full export of the household as JSON.
- `manage-delete-account` a member can delete their sign-in; the household data is preserved.

## How to get to it (user POV)

- Choose `Manage` in the top navigation.
- Open `/manage` directly.
- Follow an invite link at `/invite/[token]` to join a new household.

## Driving it with agent-browser

Preconditions:

- Sora is healthy at `http://127.0.0.1:3210`; `control-sora doctor` passes.
- The seeded household is in place (`control-sora reset`): two members; one shared household; agent access is on with two tokens.
- The browser is signed in as `avery@sora.test` (`control-sora login`).

- **Open the manage page.** Run `control-sora browser open http://127.0.0.1:3210/manage`. Assert the cards, in order: `Your space`, `Invite link`, `Agent access`, `Members`, `Currency settings`, `Transaction categories`, `Budgets`, `Your data`, `Delete account`.
- **Members.** Assert both `Avery Quinn` and `Blake Rivera` appear with role badges. A full member sees the role select; a view-only member sees the badges instead.
- **Rename the space.** Run `control-sora browser find role button click --name "Rename"` (the `Rename` button next to the `House` icon). Fill `Name` with `Lakeview Villa` and submit. The card reads `Lakeview Villa` and a toast reads `Space renamed`.
- **Digest toggle.** Assert the digest switch reflects the current state; toggling flips and persists.
- **Export.** Run `control-sora browser eval 'window.__export=null;const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{b.text().then(t=>{window.__export=t});return o(b)};"hooked"'`, then `Find role button click --name "Download full export (JSON)"`. `window.__export` matches `transactions` with `id` and `amount` keys; the count matches the fixture.
- **Delete account.** Confirm dialog flow end-to-end is available in a solo-only dev database; on the shared seed, exercise it only if you can restore the fixture immediately after.
- **Proof.** `control-sora browser screenshot <artifact-dir>/manage/page.png` and `browser snapshot -i`.

## Gotchas

- The page orders cards top to bottom as listed above; `Agent access` is above `Members`.
- The currency at the top of the page is the household currency set at the wizard; it is not editable here.
- The invite link's QR code uses an inlined SVG and does not appear in the DOM's responsive snapshot; use the `Copy invite link` button to copy it.
- `Budgets` and `Transaction categories` are interactive; exercise them via their own feature files.
- A view-only member cannot `Remove` another member; the server enforces the role and the trash icon hides for view-only members / members whose role is not less than the caller's.
- The `Leave household` button only appears when at least one other member exists in the household.
