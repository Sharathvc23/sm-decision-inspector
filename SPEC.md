# Decision-Envelope Rendering — Working Draft

*Specification for the `type: "decision"` variant of the Attested Action Envelope (AAE), as consumed by `sm-decision-inspector` v0.1.*

This document is a **working draft**. It describes the wire shape, quorum semantics, and rendering rules used by the reference implementation. It MUST be read alongside the AAE specification ([sm-attest-viewer/SPEC.md](https://github.com/Sharathvc23/sm-attest-viewer/blob/main/SPEC.md)) — particularly §3 (base envelope), §6 (lifecycle), and §13 (envelope kinds). This document does not restate sections that are already normative in the upstream AAE spec; it only documents the decision-envelope-specific additions.

---

## 1. Scope and Non-Goals

### 1.1 Scope

This specification defines:

- The wire shape of a `type: "decision"` AAE envelope.
- The M-of-N quorum policy applied to a decision envelope's proof set.
- The signer-roster derivation rules.
- The trust-state derivation specialized for decision envelopes.
- The rendering contract for the reference inspector (`sm-decision-inspector`).
- The recommended shape of a server-side countersignature endpoint that consumers wire approve / deny gestures to.

### 1.2 Non-Goals

This specification does **not** define:

- The wire encoding of countersignatures (COSE-Sign1, JWS, DataIntegrityProof — covered by upstream AAE §4).
- The lifecycle ladder (`proposed → signed → committed → anchored → reconciled` — covered by upstream AAE §6).
- The transparency-log anchoring contract (covered by upstream AAE §5).
- Renderer-side cryptographic verification of `payload.proofs[]` (deferred to v1.x).

### 1.3 Audiences

- **Substrate authors** producing `type: "decision"` envelopes.
- **HITL workbench implementers** consuming this package or building parallel consumers.
- **Verifiers** validating decision envelopes after-the-fact.

---

## 2. Relationship to the AAE Specification

A decision envelope is an AAE envelope (upstream §3) with `type = "decision"` (upstream §13). All base-envelope rules apply unchanged:

- The `v: 1` schema version marker (upstream §3.7).
- The required top-level fields `id`, `ts`, `tenant`, `actor`, `topic`, `classification`, `payload` (upstream §3.1).
- The optional `lifecycle`, `evidence_ref`, `trace_id` fields (upstream §3.2).
- The wire formats (upstream §4) and anchoring requirements (upstream §5).

This document adds:

- A normative shape for the `payload` field when `type = "decision"` (§3 below).
- The `payload.proofs[]` array used to carry M-of-N countersignatures (§4).
- An optional top-level `predecessor_hash` field linking a decision back to the action envelope it authorizes (§5).
- Quorum and trust-state derivation rules specialized for decision envelopes (§6, §7).

---

## 3. Decision Payload (Normative)

When `type = "decision"`, the `payload` field MUST conform to the following shape:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `subject` | object | no | Subject of the decision — same `{namespace, value, did}` shape as upstream §3.4. Typically the operator's identity. |
| `kind` | string | no | Operator-defined decision verb. Consumers define their own taxonomy; common values include `"operator_authorize"`, `"operator_deny"`, `"operator_annotate"`. |
| `annotation` | string | no | Free-text annotation accompanying the decision. Rendered as plain text — no markdown or HTML. |
| `recorded_at` | RFC 3339 datetime | no | When the operator's decision was recorded. May differ from envelope `ts` if the decision was buffered. |
| `proofs` | array of `IntentProof` (see §4) | no | Multi-signature proof set. Absence indicates no countersignatures have been gathered yet. |

Consumers MAY include additional fields in `payload`. The inspector ignores unrecognized keys.

### 3.1 `payload.kind` versus envelope `type`

These two fields are distinct and MUST NOT be conflated:

- The envelope-root `type` is the kind discriminator from upstream §13 (`"decision"` for this document).
- `payload.kind` is the operator's verb taxonomy within the decision variant.

---

## 4. `IntentProof` and the Proof Set (Normative)

`payload.proofs[]` is an ordered array of `IntentProof` entries. Each `IntentProof` has the following shape:

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | W3C VC proof type (e.g. `"Ed25519Signature2020"`, `"DataIntegrityProof"`). |
| `cryptosuite` | string | Required when `type === "DataIntegrityProof"`. One of the cryptosuites registered in upstream AAE §4.4. |
| `created` | RFC 3339 datetime | Timestamp the signature was applied. |
| `verificationMethod` | DID URL | Signer identity (e.g. `"did:example:ops/approver-alice#key-1"`). |
| `proofPurpose` | string | Typically `"assertionMethod"`. |
| `proofValue` | string | Encoded signature bytes (base58 or base64 per the cryptosuite). |

### 4.1 Ordering and idempotency

The proof set is treated as a **multiset keyed on `verificationMethod`**: two proofs sharing a verification method count as one distinct signer (idempotent countersignature). Order is preserved for display purposes but does NOT affect quorum derivation.

### 4.2 Signature scope

Each `proofValue` MUST sign the canonicalized decision envelope **excluding the `proofs[]` array itself** (the standard W3C VC countersignature pattern — each signer signs the same canonical bytes). Verifiers reconstruct the signed bytes by serializing the envelope with `payload.proofs` removed.

### 4.3 Cross-signer verification

Each `IntentProof` MUST verify independently against its `verificationMethod` — there is no chained dependency between proofs.

---

## 5. Linking a Decision to its Action (Normative)

A decision envelope SHOULD carry an explicit `predecessor_hash` at envelope root pointing to the AAE envelope it authorizes, denies, or annotates:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `predecessor_hash` | hex SHA-256 | recommended | Hash of the canonicalized predecessor envelope. Renderers MAY surface this as a chain-walk affordance. |

The `predecessor_hash` is omitted only when the decision applies to a synthetic or aggregate action (rare; consumers SHOULD document this case explicitly).

`trace_id` (upstream §3.2) is the looser correlation identifier and is independent of `predecessor_hash`.

---

## 6. Quorum Derivation (Normative)

The inspector applies a `QuorumPolicy` to each decision envelope:

```
QuorumPolicy = { required: int, roster?: string[] }
```

- `required` (M) is the minimum number of distinct, in-roster signers required to satisfy the policy.
- `roster` (N) is the optional explicit list of acceptable signer DID URLs. When present, only proofs whose `verificationMethod` is in the roster count toward `required`.

### 6.1 Distinct signers

Distinct signers are computed by:

1. Iterating `payload.proofs[]` in order.
2. Trimming each `verificationMethod` and discarding empty or missing values.
3. (If `roster` is present) discarding values not in `roster`.
4. Deduplicating by string equality on the (trimmed) `verificationMethod`.

### 6.2 Quorum state

The derived `QuorumState` is:

| Field | Value |
|-------|-------|
| `signers` | The count from §6.1. |
| `required` | `policy.required`, clamped to `max(0, floor(required))`. |
| `satisfied` | `signers >= required`. |
| `pending` | `signers > 0 && signers < required`. |

A decision envelope with `policy.required = 0` is degenerate-but-valid: any envelope satisfies it. Implementations SHOULD treat this as an operator opt-out signal rather than a default.

### 6.3 Signer roster

The signer roster displayed by the inspector is:

- **With roster:** one entry per roster member, in declared order. Each entry's `signed` flag is `true` iff that DID URL appears in the distinct-signers set.
- **Without roster:** one entry per distinct signer observed in the proof set, in first-seen order. All entries are `signed: true`.

Each entry carries the `signedAt` timestamp from the first matching proof's `created` field (or `null` when unsigned).

---

## 7. Trust-State Derivation (Normative)

Trust state for a decision envelope follows the upstream AAE §11.2 mapping with one addition:

| Condition | Trust state |
|-----------|-------------|
| `lifecycle ∈ {"signed", "committed", "anchored", "reconciled"}` | `verified` |
| `lifecycle === "proposed"` | `pending` |
| No lifecycle, `evidence_ref` present (legacy fallthrough) | `verified` |
| **No lifecycle, quorum satisfied** | `verified` *(decision-specific)* |
| Otherwise | `pending` |

The decision-specific rule reflects the operator-side truth that an M-of-N satisfied decision IS the trust signal, independent of substrate lifecycle marking.

The inspector does NOT cryptographically verify `proofValue` entries at v0.1; "verified" means "the quorum policy is satisfied AND the substrate marks the envelope as committed/anchored OR the quorum is independently satisfied." A future version (§7.1 of this document) will add renderer-side proof verification.

### 7.1 Renderer-side verification (planned)

A future version of this document will define the renderer's verification path:

1. For each `IntentProof`, resolve `verificationMethod` to a public key via the consumer's DID resolver.
2. Verify `proofValue` against the canonicalized envelope (with `payload.proofs` removed) per the proof's cryptosuite.
3. Mark the envelope `verified` only when (a) the quorum policy is satisfied AND (b) every counted proof verifies.

Until that lands, consumers requiring independent cryptographic verification SHOULD run a W3C VC verify library before passing envelopes to the inspector.

---

## 8. Recommended Server-Side Countersignature Endpoint (Informative)

The inspector's approve / deny callbacks are *gestures* — they intentionally do not sign in the browser. Consumers SHOULD implement a server-side endpoint that:

1. Authenticates the operator (the surrounding HITL stack's responsibility).
2. Resolves the operator's signing key from a server-held keystore or KMS.
3. Signs the canonicalized decision envelope (with `payload.proofs` removed) using the operator's key.
4. Appends the resulting `IntentProof` to `payload.proofs[]`.
5. Re-emits the envelope to the substrate (typically the same AG-UI topic the proposal arrived on).

A minimal request shape:

```json
{
  "envelope_id": "01HXEZ0EXAMPLEDECISION2OF3",
  "gesture": "approve",
  "annotation": "Reviewed. Authorize."
}
```

A minimal response shape on success:

```json
{
  "envelope_id": "01HXEZ0EXAMPLEDECISION2OF3",
  "proof_appended": true,
  "quorum_satisfied_after": false
}
```

The endpoint MUST reject the request if the operator has already countersigned (idempotency) or if the envelope is no longer in a `proposed` or partial-quorum state.

---

## 9. Rendering Rules (Normative for the reference inspector)

The reference inspector (`sm-decision-inspector` v0.1) enforces the following rendering rules:

### 9.1 No content escape

Every user-supplied field — including `payload.annotation`, signer display names, and decision kind verbs — MUST reach the DOM through React's default text-escaping path. `dangerouslySetInnerHTML` is forbidden.

### 9.2 Hardened object lookups

Internal status, tone, and trust-state maps MUST be accessed via `Object.hasOwn` guards. A hostile classification, kind, or status string MUST NOT resolve to a prototype method (`__proto__`, `toString`, etc.).

### 9.3 Defensive parsing

Malformed timestamps, missing payload fields, and non-string runtime values MUST render gracefully (typically as `??:??:??` for time, neutral tone for classification, em-dash for missing identifiers).

### 9.4 Locked gesture surface

When `quorum.satisfied === true` OR the consumer has flagged `alreadySigned === true`, both the approve and deny buttons MUST be disabled with an explicit hint surfacing the reason. Consumers MAY override per-button via `approveDisabled` / `denyDisabled` props.

### 9.5 Substrate-neutrality

The inspector MUST NOT open connections, poll endpoints, or make network calls of any kind. The consumer is the sole authority on data ingestion. This is the load-bearing rule that lets the package compose with any substrate.

---

## 10. Open Questions for v1.0

1. **Cryptographic verification path.** §7.1 sketches renderer-side proof verification. v1.0 would describe the reference implementation, including how it composes with the upstream AAE verifier.
2. **Quorum policy ratchet.** Whether a policy update (`required` increases mid-decision) invalidates previously-satisfied countersignatures, or only applies to new proposals.
3. **Cross-organizational countersignatures.** When operators from different organizations countersign, whether their DIDs MUST resolve to the same governing authority.
4. **Decision-of-decisions.** Whether a decision envelope can be itself the subject of another decision (escalation chain), and how the inspector renders the resulting graph.
5. **Annotation history.** Whether multiple operators' annotations during countersignature accumulate as separate fields or are merged.

---

*Working draft last modified: 2026-05-20.*

*Aligned with [Project NANDA](https://projectnanda.org) standards. [Stellarminds.ai](https://stellarminds.ai)*
