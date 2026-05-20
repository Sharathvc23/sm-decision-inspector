# Contributing to `sm-decision-inspector`

Thanks for your interest. This document covers the basics — code style, how to propose changes, and what makes a good PR for this repository specifically.

## Scope

`sm-decision-inspector` is the reference React workbench for the `"decision"` variant of the Attested Action Envelope (AAE) — the per-decision evidence primitive aligned with the Attestation pillar of Project NANDA's four-pillar architecture. PRs that don't fit one of the categories below are still welcome, but the response will start with a scope-check conversation:

- **Working-draft alignment** — the inspector's behavior tracks the wire format, quorum semantics, and rendering rules documented in [`SPEC.md`](./SPEC.md). Changes that bring the inspector into closer alignment with that documented behavior are welcome.
- **Bug fixes** — anything that fixes incorrect behavior, accessibility gaps, type-safety holes, or gesture-surface defects.
- **New fixtures** — additional decision-envelope shape examples covering quorum trajectories the existing fixtures don't (e.g., mixed-signer roster, reject-after-partial-quorum, cross-organization countersignatures).
- **Working-draft revisions** (changes to `SPEC.md`) — these go through a heavier review. See *Working-draft revisions* below.

Out of scope: building a substrate, wiring AG-UI / MCP / A2A specifically (consumer concern), implementing the server-side countersignature endpoint (consumer concern), and adding a runtime dependency on any particular agent framework or signing library.

## Development setup

```bash
git clone https://github.com/Sharathvc23/sm-decision-inspector.git
cd sm-decision-inspector
pnpm install   # or npm install
pnpm typecheck
pnpm test
```

Node 22+, pnpm 9+ recommended. The package targets ES2022.

## Tests

The pure functions in `src/quorum-logic.ts` are the highest-coverage targets. If you change derivation logic (`deriveQuorumState`, `buildSignerRoster`, `deriveDecisionTrustState`), the PR must include tests demonstrating the new behavior. Tests live under `tests/`.

```bash
pnpm test            # one shot
pnpm test:watch      # watch mode
pnpm test:coverage   # with coverage report
```

## Code style

- TypeScript strict mode is required.
- Pure functions in `quorum-logic.ts`; no I/O, no React state.
- Components use `"use client"` directive where they hold state or render in a client environment.
- Tailwind utility classes via `cn()`. CSS variables (`--gem-*`) for theme-bound color tokens.
- No `any`. If you reach for `any`, reach for `unknown` and a type guard instead.

## Commit messages

Use imperative mood: "fix: defensive verificationMethod parse in distinctSigners," not "fixed defensive parse." A `Conventional Commits` prefix (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`) is encouraged but not required.

## DCO

Sign off commits with `-s` to attest to the [Developer Certificate of Origin](https://developercertificate.org/):

```bash
git commit -sm "fix: defensive verificationMethod parse"
```

This package does **not** require a CLA. The DCO sign-off is sufficient.

## Working-draft revisions

Changes to `SPEC.md` go through a heavier review than code changes:

1. Open a GitHub Discussion (or issue with the `wire-format-change` label) describing the change and the rationale.
2. Wait for at least one substantive response before opening the PR.
3. The PR must update both `SPEC.md` and the relevant code/types so the documented behavior and the inspector stay aligned.
4. Changes that adjust the quorum-state derivation contract require a corresponding version bump.

## Gesture-surface invariants

The approve / deny controls are gesture-only — they MUST NEVER hold or use a private key in the browser. PRs that move signing into the browser will be rejected on principle. See `SPEC.md` §8 for the recommended server-side endpoint contract.

## NANDA alignment

This inspector is positioned as a NANDA Pillar 4 (Attestation) reference. Contributions that strengthen the integration with NANDA primitives — AgentFacts resolution, KYA 1.0 composition, ART registry lookup, ACAP authorization handoff — are explicitly welcome. The README and SPEC §2 are the source of truth on how decision envelopes relate to other NANDA work.

## Reporting issues

Open an issue at https://github.com/Sharathvc23/sm-decision-inspector/issues with:

- What you expected to happen.
- What actually happened.
- A minimal reproduction (CodeSandbox link or a `tests/` test case is ideal).
- The version of `@sharathvc/sm-decision-inspector` you're using.

Security issues: please email rather than filing publicly. Contact details in the package metadata.
