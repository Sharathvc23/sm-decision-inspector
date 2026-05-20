# sm-decision-inspector

**The audited human-in-the-loop workbench for attested agent decision streams.**

When an autonomous agent proposes a high-stakes action, the substrate often emits an *attestation* — but the **decision** to authorize, deny, or annotate that action belongs to a human supervisor. In sensitive domains the decision itself is multi-party: an M-of-N quorum of operators must countersign before the effect commits. The interface where those operators read the proposed action, see who else has signed, and submit their own gesture is itself a security boundary — content-injection attacks, mistaken click targets, and silent quorum drift all live here.

`sm-decision-inspector` is the React / TypeScript renderer for **decision envelopes** — the `type: "decision"` variant of the [Attested Action Envelope (AAE)](https://github.com/Sharathvc23/sm-attest-viewer/blob/main/SPEC.md#13-envelope-kinds-v02-normative) — the per-decision evidence primitive aligned with [Project NANDA](https://projectnanda.org)'s Attestation pillar. It surfaces the proposed action, the M-of-N countersignature roster, the live quorum chip, and the operator gesture controls (approve / deny) as a forensic, audited workbench, so what the operator reads and clicks on is exactly what the substrate emitted — without transformation, without escape, with no opportunity for hostile content to execute.

It is **one layer of a human-in-the-loop verification stack** — the trustworthy *workbench step*. Operator authentication, hardware-attested endpoints, server-side signing, and audit logging are responsibilities of the surrounding stack, not this package.

The companion to [`sm-attest-viewer`](https://github.com/Sharathvc23/sm-attest-viewer) (chronological forensic timeline) in an otherwise Python-first portfolio of [Stellarminds.ai](https://stellarminds.ai) primitives aligned with Project NANDA standards.

## What this package secures (v0.1)

- **No content escape.** Every user-supplied field in the envelope (annotations, signer labels, decision verbs) reaches the DOM through React's default text-escaping path — no `dangerouslySetInnerHTML`, no string interpolation into HTML.
- **Hardened object lookups.** Internal status and tone maps are accessed via `Object.hasOwn` guards so a hostile classification or status string cannot resolve to a prototype method.
- **Defensive parsing.** Malformed timestamps, missing payload fields, non-string runtime values render gracefully rather than crash.
- **Locked gesture surface.** When quorum is satisfied or the operator has already countersigned, the approve / deny buttons are disabled with an explicit hint — no accidental double-sign, no quorum bypass via stale UI state.
- **Adversarially tested.** XSS payloads, prototype-pollution attempts, malformed inputs, and unknown trust states are explicitly covered in the test suite.

## What this package does not (yet) do

- **Independent cryptographic verification of the proof set.** The inspector treats `payload.proofs[]` as opaque shape and derives quorum from distinct `verificationMethod` counts. Verifier-side signature checks are a v1.x property — see [`SPEC.md`](./SPEC.md) §7.
- **Hold private keys or sign envelopes in the browser.** Approve / deny are *gestures*; the consumer wires the callbacks to a server-side signing service that holds keys (the standard HITL pattern).
- **Operator authentication, audit logging, endpoint attestation.** These belong to the surrounding HITL stack. Adopters wire their own.

## Features

- **Substrate-neutral** — accepts decision envelopes as a `props` array; connect to AG-UI, MCP, A2A, websockets, or JSONL replay.
- **Domain-neutral** — no hardcoded taxonomy for decision verbs, classifications, or quorum policies.
- **Tested behavior** — pure derivation functions for quorum state and signer roster exported and exhaustively unit-tested against the rules documented in [`SPEC.md`](./SPEC.md) §6 and §7.
- **Three reference fixtures** covering common M-of-N trajectories: single-signer satisfied (1-of-1), partial quorum pending (2-of-3), and multi-signer satisfied (3-of-5) with mixed cryptosuites.
- **Accessible signer roster** showing each operator's signed / awaiting status with a screen-reader-readable icon and DID label.
- **Read-only mode** — omit the approve / deny callbacks for an audit-only view of an in-flight decision queue.

## Installation

### From source (current)

The package is not yet published to npm. To use the v0.1 working draft today, install directly from the repository:

```bash
git clone https://github.com/Sharathvc23/sm-decision-inspector.git
cd sm-decision-inspector
pnpm install
pnpm test
```

### From npm (planned)

Once v0.1 stabilizes, the package will be published as `@sharathvc/sm-decision-inspector`:

```bash
npm install @sharathvc/sm-decision-inspector
# or
pnpm add @sharathvc/sm-decision-inspector
```

Peer dependencies: `react >= 19.0.0`, `react-dom >= 19.0.0`.

## Quick Start

```tsx
import {
  DecisionInspector,
  type DecisionEnvelope,
  type QuorumPolicy,
} from "@sharathvc/sm-decision-inspector";

const policy: QuorumPolicy = {
  required: 2,
  roster: [
    "did:example:ops/approver-alice#key-1",
    "did:example:ops/approver-bob#key-1",
    "did:example:ops/approver-carol#key-1",
  ],
};

export function MyHITLQueue() {
  const [envelopes, setEnvelopes] = useState<DecisionEnvelope[]>([]);
  return (
    <DecisionInspector
      envelopes={envelopes}
      policy={policy}
      status="open"
      onApprove={(env) => fetch("/api/decisions/countersign", { method: "POST", body: JSON.stringify({ id: env.id, gesture: "approve" }) })}
      onDeny={(env) => fetch("/api/decisions/countersign", { method: "POST", body: JSON.stringify({ id: env.id, gesture: "deny" }) })}
    />
  );
}
```

Wire `envelopes` to wherever your decision envelopes come from — an AG-UI stream, an MCP tool output, a JSONL file, or a websocket. Approve / deny callbacks should call your server-side signing endpoint; never hold private keys in the browser.

## Reference fixtures

```tsx
import { decisionFixtures } from "@sharathvc/sm-decision-inspector/fixtures";

decisionFixtures.oneOfOne;              // single-signer, satisfied
decisionFixtures.twoOfThreePending;     // partial quorum, pending
decisionFixtures.threeOfFiveSatisfied;  // multi-signer, satisfied, mixed suites
```

Fixture signatures use placeholder bytes — they do not verify against real keys. Treat them as shape examples.

## Consumer Responsibilities

The inspector uses Tailwind CSS utility classes and a small set of CSS custom properties for trust-state tones. Consumers must:

1. Have Tailwind CSS configured (any v3 or v4 release).
2. Define `--gem-verified`, `--gem-warning`, `--gem-failed`, `--gem-pending` CSS variables in their root scope (the same tokens used by `sm-attest-viewer`).
3. Wire `<TooltipProvider>` once at the app root if any consumed primitives use tooltips.
4. Implement a server-side countersignature endpoint that the approve / deny callbacks delegate to — see [`SPEC.md`](./SPEC.md) §8 for the recommended shape.

## Specification

The decision-envelope wire format, quorum semantics, and rendering rules used by the reference implementation are documented in [`SPEC.md`](./SPEC.md) as a working draft. The design rationale and the role of decision rendering as a separable primitive live in [`WHITEPAPER.md`](./WHITEPAPER.md).

## Related Packages

### Operator surfaces (peers)

| Package | Role |
|---|---|
| [`sm-attest-viewer`](https://github.com/Sharathvc23/sm-attest-viewer) | Chronological forensic timeline for AAE streams. **Renders all four envelope kinds** (action, decision, belief, checkpoint). The decision-inspector is the deeper workbench for the `"decision"` variant. |
| [`sm-attest-auditor`](https://github.com/Sharathvc23/sm-attest-auditor) | Bidirectional audit drill — forward chain-walk via `predecessor_hash` and reverse RFC 6962 merkle inclusion verification from checkpoint envelopes. |

### Behavioral Trust (produces / stages AAEs)

| Package | Role |
|---|---|
| [`sm-locp`](https://github.com/Sharathvc23/sm-locp) | Open Compliance Protocol — defeasible-logic engine + W3C VC issuance. **Produces AAEs.** |
| [`sm-enclave`](https://github.com/Sharathvc23/sm-enclave) | Speculative execution sandbox; stages side effects before decision commit. |

### Federation

| Package | Role |
|---|---|
| [`sm-bridge`](https://github.com/Sharathvc23/sm-bridge) | NANDA-compatible registry endpoints + Quilt-style delta sync. |

### Model Trust

| Package | Role |
|---|---|
| [`sm-model-provenance`](https://github.com/Sharathvc23/sm-model-provenance) | Zero-dependency model identity dataclass. |
| [`sm-model-card`](https://github.com/Sharathvc23/sm-model-card) | Unified model card schema. |
| [`sm-model-integrity-layer`](https://github.com/Sharathvc23/sm-model-integrity-layer) | Offline integrity verification. |
| [`sm-model-governance`](https://github.com/Sharathvc23/sm-model-governance) | Three-plane ML governance — training → approval → serving. |

## License

[MIT](./LICENSE)

---

*First published: 2026-05-20 | Last modified: 2026-05-20*

*Personal research contributions aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
