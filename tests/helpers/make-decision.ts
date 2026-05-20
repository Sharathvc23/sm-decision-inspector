import type { DecisionEnvelope, IntentProof } from "../../src/types";

let counter = 0;

/** Build a minimal decision envelope for tests; override any field via partial. */
export function makeDecision(
  overrides: Partial<DecisionEnvelope> = {},
): DecisionEnvelope {
  counter += 1;
  const base: DecisionEnvelope = {
    v: 1,
    id: `decision-${counter}`,
    ts: "2026-05-20T08:00:00.000Z",
    tenant: "acme-corp",
    actor: {
      namespace: "ops",
      value: "approver-alice",
      did: "did:example:ops/approver-alice",
      display_name: "Alice Approver",
    },
    topic: "tenants/acme-corp/decisions/proposals",
    type: "decision",
    classification: "internal",
    payload: {
      subject: {
        namespace: "ops",
        value: "approver-alice",
        did: "did:example:ops/approver-alice",
      },
      kind: "operator_authorize",
      recorded_at: "2026-05-20T08:00:00.000Z",
      proofs: [],
    },
    lifecycle: "proposed",
  };
  return { ...base, ...overrides };
}

/** Build a minimal IntentProof for tests. */
export function makeProof(overrides: Partial<IntentProof> = {}): IntentProof {
  return {
    type: "Ed25519Signature2020",
    verificationMethod: "did:example:ops/approver-default#key-1",
    created: "2026-05-20T08:00:00.000Z",
    proofPurpose: "assertionMethod",
    proofValue: "z58DAdFfa9SkqZMVPxAQp1RaY4eHnLPxL2NHCpHFRq9rPwExampleDefault==",
    ...overrides,
  };
}
