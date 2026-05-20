# sm-decision-inspector: The Operator's Workbench for Attested Agent Decisions

*Personal research contribution by [Stellarminds.ai](https://stellarminds.ai), aligned with [Project NANDA](https://projectnanda.org) standards.*

---

## Abstract

The Attested Action Envelope (AAE) defines four envelope kinds: `action`, `decision`, `belief`, and `checkpoint`. The chronological renderer ([`sm-attest-viewer`](https://github.com/Sharathvc23/sm-attest-viewer)) surfaces all four interleaved on a forensic timeline. But a single envelope kind — `decision` — carries a fundamentally different operator workload from the other three: it is the only kind that demands an *active gesture* in response, often from multiple humans under an M-of-N quorum policy.

This whitepaper makes the case that decision-envelope rendering is a primitive in its own right, separable from the chronological viewer, and that a substrate-neutral, gesture-safe, M-of-N-aware workbench is the right shape for that primitive. The wire format, quorum semantics, and rendering rules used by the reference implementation are documented in [`SPEC.md`](./SPEC.md) as a working draft. This document covers motivation, design choices, and composition with the rest of the portfolio.

---

## 1. Problem

When a high-stakes autonomous agent proposes an action, three things happen in sequence:

1. The substrate emits an **action envelope** — "the agent will do X under rule Y at time Z."
2. One or more **operators evaluate** the proposal — reading the rule citation, checking the evidence, considering the predecessor chain.
3. The operators **countersign** a decision envelope — "I, holding key K, authorize / deny this."

Step 3 is where the human-in-the-loop verification stack actually commits or rejects. The interface that mediates this step has three load-bearing properties that distinguish it from the chronological timeline:

- **It is a gesture surface.** The operator is not just reading — they are submitting an authoritative click that becomes part of the on-ledger evidence trail.
- **It is multi-party.** In any consequential domain, single-operator signing is rare. The interface must show *who else has signed*, *who still needs to*, and *what the quorum policy is* — without those three facts the operator cannot make an informed decision.
- **It is locking.** Once quorum is reached, the decision becomes immutable. The interface must communicate locking transitions clearly so an operator does not accidentally double-sign or attempt to reverse a committed decision.

A chronological timeline can show that decisions exist. It cannot ergonomically serve all three properties above. That is the case for a separable primitive.

---

## 2. The Workbench Primitive

The decision-inspector binds together six facts about each in-flight decision:

| Fact | Surface |
|---|---|
| **What** is being decided | Decision row (kind + classification + annotation) |
| **Who** can countersign | Signer roster (the `roster` policy) |
| **Who already has** | Signer roster (per-row `signed` indicator + timestamp) |
| **How close to quorum** | Quorum chip (`signers / required` readout, color-coded by status) |
| **What the operator can do now** | Approve / Deny controls (disabled when locked) |
| **What it links back to** | `predecessor_hash` chain-walk affordance (delegated to sibling auditor) |

At v0.1, the wire envelope (per [`SPEC.md`](./SPEC.md) §3–§5) carries these facts in their natural locations. The inspector's job is to surface them in a way that is gesture-safe — i.e., where the operator's gesture corresponds **exactly** to the bytes that the server-side signer will subsequently sign, with no opportunity for content-injection to manipulate either side.

---

## 3. Design Axioms

`sm-decision-inspector` is built on four axioms.

### 3.1 The inspector is presentation-only

The inspector never:

- Opens connections to a substrate.
- Holds operator private keys.
- Signs anything cryptographically.
- Calls a remote API.

These are deliberate. The inspector accepts a `DecisionEnvelope[]` array and a `QuorumPolicy` as props; it exposes `onApprove` / `onDeny` callbacks. The consumer wires those callbacks to a **server-side** signing service that holds keys, signs envelopes, and emits the result back to the substrate. The browser is not a trust boundary suitable for holding operator keys; the inspector is structured to make this property invariant.

### 3.2 Quorum is derived, never stored

The `QuorumState` (satisfied, pending, signer count) is recomputed from `payload.proofs[]` on every render. There is no cached state, no manual flag, no "mark as approved" toggle. This means the inspector cannot be tricked into showing satisfied quorum when the wire envelope says otherwise — a content-injection attack on signer DID strings cannot manipulate quorum because the derivation only counts distinct values in the actual proof set.

### 3.3 The gesture surface is locked when quorum is satisfied

Once `quorum.satisfied === true`, the approve and deny buttons are unconditionally disabled. The consumer cannot override this via props; the only override is the per-button `approveDisabled` / `denyDisabled` escape (used for narrower restrictions like "you have already signed"). This prevents an entire class of HITL bugs where a stale UI lets an operator double-sign or submit a gesture against an already-locked envelope.

### 3.4 The inspector is substrate-neutral

The inspector accepts decision envelopes as plain `props`. It works with AG-UI streams, MCP tool outputs, A2A messages, websocket feeds, JSONL replay, or mocked arrays. This is the same load-bearing rule that lets the sibling `sm-attest-viewer` work with any AAE source — and it lets this package serve as a reference implementation for any substrate that emits decision envelopes.

---

## 4. Composition with the Portfolio

```
  ┌───────────────────────────────────────────────────────────┐
  │           HUMAN-IN-THE-LOOP VERIFICATION STACK            │
  │                                                           │
  │   ┌─────────────────────┐    ┌─────────────────────────┐  │
  │   │ sm-attest-viewer    │    │ sm-decision-inspector   │  │
  │   │ (chronological      │    │ (decision workbench)    │  │
  │   │  timeline)          │    │                         │  │
  │   └─────────────────────┘    └─────────────────────────┘  │
  │            ▲                            ▲                 │
  │            │       AAE envelopes        │                 │
  │            │  (action/decision/belief/  │                 │
  │            │       checkpoint)          │                 │
  └────────────┼────────────────────────────┼─────────────────┘
               │                            │
  ┌────────────┴────────────┐  ┌────────────┴────────────┐
  │     PRODUCER LAYER      │  │     CONSUMER LAYER      │
  │                         │  │                         │
  │    sm-locp     →     sm-airlock    →     sm-enclave  │
  │  (rule engine)    (capability       (speculative     │
  │                    sandbox)          execution)      │
  └─────────────────────────┘  └─────────────────────────┘
```

The decision-inspector is one of two operator-facing surfaces in the portfolio. The viewer answers "what has been attested so far?" The inspector answers "what does this operator need to do right now?" They share the AAE wire envelope as the contract, and they share the trust-state CSS tokens (`--gem-verified` etc.) so a consumer embedding both gets visually consistent trust signaling.

### 4.1 Where decision envelopes come from

A decision envelope is typically emitted in response to an action envelope. The producer chain is:

1. Agent issues an action envelope: `type: "action"`, `payload.kind: "rule_citation"`, naming the strict rule it relied on.
2. The substrate's policy engine determines the action requires HITL countersignature (e.g., classification == "restricted" AND value > threshold).
3. The substrate emits a derived decision envelope: `type: "decision"`, `predecessor_hash` pointing at the action, `payload.proofs: []` (empty initially).
4. The decision arrives at the operator's inspector.
5. Operators countersign (each gesture appends to `payload.proofs[]`).
6. When `signers >= required`, the substrate accepts the decision and the underlying action commits.

This package owns step (4) — surfacing the in-flight decision to the operators. Steps (1)–(3) are the substrate's responsibility. Steps (5)–(6) are the server-side signing service's and the substrate's, respectively.

### 4.2 Verification path

A decision envelope is independently verifiable using only:

- The envelope itself.
- The DID resolver for each `verificationMethod` in `payload.proofs[]`.
- The quorum policy in effect at evaluation time.

The verifier walks `payload.proofs[]`, resolves each verification method, verifies each `proofValue` against the canonicalized envelope (with proofs removed), counts distinct in-roster signers, and compares against `policy.required`. No proprietary service is on the verification path. (A countersignature service IS on the production path, but never on the verification path.)

---

## 5. What This Whitepaper Is Not

This whitepaper does not argue that decision envelopes solve HITL. They do not. They are one part of a stack that also includes:

- **Operator authentication.** This package does not authenticate the operator. The surrounding stack does.
- **Hardware-attested endpoints.** A compromised operator endpoint can submit gestures the operator did not intend. Defenses live in TPM-backed key attestation and out-of-band verification.
- **Server-side signing security.** The HSM / KMS holding operator keys is outside the scope of this package.
- **Audit logging.** The countersignature endpoint must log every gesture against operator identity. This package does not implement that log.

Decision-envelope rendering is a *necessary* but not *sufficient* property of a trustworthy HITL stack. The argument of this document is that it is a separable primitive worth building well, not that it is the whole stack.

---

## 6. Status

`sm-decision-inspector` v0.1 is a working draft of the rendering primitive. The wire format, quorum semantics, and rendering rules are documented in [`SPEC.md`](./SPEC.md). The reference implementation is in this repository under [MIT License](./LICENSE).

Contributions welcome — see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Issues at [github.com/Sharathvc23/sm-decision-inspector/issues](https://github.com/Sharathvc23/sm-decision-inspector/issues).

---

*First published: 2026-05-20.*

*Aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
