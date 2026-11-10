---
name: maintain-verification-skill
description: 'Periodic pass that keeps Sora''s verification skill and feature map honest: parallel source readers per feature, one live session driving every feature, proven corrections left in the working tree. Use for /maintain-verification-skill or "audit the verify skill".'
disable-model-invocation: true
---

# Maintain the Sora verification skill

A feature map rots the moment the app changes. This skill is the upkeep loop for `verify-sora` (and for any project-local verification skill with a feature map). The unit of rigor is the feature, not every sentence: cover every feature file from source and exercise every feature live, without terminalising every bullet.

## Outcomes

Pick one, and say which:

- **clean** — every feature got source and live coverage; nothing worth shipping. Nothing changed.
- **changed** — proven doc, harness, or map corrections are sitting in the working tree, uncommitted.
- **blocked** — coverage could not finish, or a proven fix could not be written safely. Say exactly what blocked it.

## Edit scope

Only edit the verification skill's own directory (`.agents/skills/verify-sora/`: its `SKILL.md`, `features/`, and the scripts it owns). Never edit product code during a run: a behaviour the map describes that the app no longer does is either doc drift (fix the map) or a product regression (report it, don't paper over it in docs).

## Pass

0. **Locate the target.** Find the verification skill to maintain: the project-local skill whose body has launch/drive sections and a feature map (`.agents/skills/verify-*/`). Several candidates → ask which one; none → stop and point at `verify-sora`'s generator instead of inventing a target.

1. **Index hygiene.** Read `features/README.md` and list its sibling files. Fix missing, extra, duplicate, or dead entries. Lightweight; no generated inventory.

2. **Source wave.** One read-only subagent per feature file, launched concurrently. Each explains "how does this user-facing feature work?" from source, flags likely doc drift with citations, and returns one concise live-verification recipe. Children never drive the app and never edit files. Return shape: feature summary / source entry points / likely drift or none / one recipe.

3. **Reconcile.** Every feature file has a returned summary. Merge overlapping recipes into as few app states as practical. Spot-check cited drift; don't re-prove clean claims. Sweep recent churn for user-facing surfaces missing from the map — require a concrete source path before calling one missing.

4. **Live pass.** Required even when the source looks clean. The coordinator owns all driving; follow the verification skill's own launch model — one long-lived instance driven serially. Exercise every feature at least once, and hold three invariants the whole pass, whatever the failure:
   1. **Never drive an instance you haven't health-checked since it last did something surprising.** `control-sora doctor` before the first drive, before each fresh session where sessions are the unit, and again after any failed drive. Where the doctor can't see the failure (a wedged UI state on a healthy process), `control-sora reset` to a known state or relaunch rather than hoping.
   2. **Evidence captured so far survives every cleanup**, checked at its named location under `.scratch/verify-sora/artifacts/<run-id>/`, not assumed.
   3. **Nothing a drive started outlives that drive's usefulness.** Failed-iteration residue is cleaned whether the session is stuck, exited, or shared; for a shared instance, clean the residue, not the instance.
      A doctor failure caused by skill drift is drift: fix it under the edit scope and retry once — restart whatever the fix invalidated, nothing more — before calling the pass `blocked`. A feature that can't be reached is `verified-unreachable` only with the concrete prerequisite (auth, entitlement, external state) and the route attempted; if the map omits that prerequisite, that's drift. Any harness fix from triage gets re-driven live before it counts as proven. Final teardown happens after the last drive of the run, including the re-proofs, so nothing outlives the run. Evidence stays.
5. **Triage.** Wrong or missing user-POV description → doc drift, fix it. Working behaviour the harness can't drive → harness gap, fix it; a harness fix follows the same helpers rule as generation (scripts executable, invocation documented in the skill body). App behaviour that is actually broken → product gap; record it for the user and keep it out of the map's fixes.
6. **Ship or stop.** For **changed**: write the proven corrections into the working tree and leave them there, uncommitted, with a summary of each file and why it changed. Do not commit, do not push, and do not open a pull request — this repo's flow is local-only, and the user reviews the diff before anything is committed. For **clean** or **blocked**: change nothing and report the outcome and the coverage honestly.

Keep concise run notes (features covered, unreachable prerequisites, confirmed drift, outcome) in `.scratch/verify-sora/runs/<run-id>.md`; they are scratch and are not committed.

## Known product gaps to expect

These were found by the verification skill on `main` and are product regressions, not doc drift. Do not "fix" them in the map; keep them recorded and re-check them on every pass.

- Choosing a category in the new-transaction dialog crashes the page with `Maximum update depth exceeded` (both the dev server and the production bundle).
- Signing in against the production bundle (`control-sora launch --prod`) leaves a blank page at `/sign-in`; the dev server is fine.
