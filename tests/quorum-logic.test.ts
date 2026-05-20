/**
 * Unit tests for src/quorum-logic.ts — the pure derivation functions
 * exported from sm-decision-inspector.
 *
 * These tests pin the contract described in SPEC §6 (quorum semantics)
 * so any future change to deriveQuorumState must update both the spec
 * and the tests in lockstep.
 */

import { describe, it, expect } from "vitest";
import {
  buildSignerRoster,
  deriveDecisionTrustState,
  deriveQuorumState,
  distinctSigners,
  formatQuorumLabel,
} from "../src/quorum-logic";
import { makeDecision, makeProof } from "./helpers/make-decision";

const VM_ALICE = "did:example:ops/approver-alice#key-1";
const VM_BOB = "did:example:ops/approver-bob#key-1";
const VM_CAROL = "did:example:ops/approver-carol#key-1";

describe("distinctSigners", () => {
  it("returns empty when no proofs are present", () => {
    expect(distinctSigners(undefined)).toEqual([]);
    expect(distinctSigners([])).toEqual([]);
  });

  it("deduplicates proofs by verificationMethod", () => {
    const proofs = [
      makeProof({ verificationMethod: VM_ALICE }),
      makeProof({ verificationMethod: VM_ALICE, created: "later" }),
      makeProof({ verificationMethod: VM_BOB }),
    ];
    expect(distinctSigners(proofs).sort()).toEqual([VM_ALICE, VM_BOB].sort());
  });

  it("filters by roster when a roster is supplied", () => {
    const proofs = [
      makeProof({ verificationMethod: VM_ALICE }),
      makeProof({ verificationMethod: VM_BOB }),
      makeProof({ verificationMethod: "did:example:outsider#key-1" }),
    ];
    expect(distinctSigners(proofs, [VM_ALICE, VM_CAROL]).sort()).toEqual([VM_ALICE]);
  });

  it("skips proofs with missing or blank verificationMethod", () => {
    const proofs = [
      makeProof({ verificationMethod: "" }),
      makeProof({ verificationMethod: "   " }),
      makeProof({ verificationMethod: undefined }),
      makeProof({ verificationMethod: VM_ALICE }),
    ];
    expect(distinctSigners(proofs)).toEqual([VM_ALICE]);
  });
});

describe("deriveQuorumState", () => {
  it("returns satisfied=false, pending=false when there are no proofs", () => {
    const env = makeDecision({ payload: { proofs: [] } });
    const q = deriveQuorumState(env, { required: 2 });
    expect(q).toEqual({ signers: 0, required: 2, satisfied: false, pending: false });
  });

  it("returns satisfied=true when distinct signers reach required", () => {
    const env = makeDecision({
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: VM_BOB }),
        ],
      },
    });
    const q = deriveQuorumState(env, { required: 2 });
    expect(q.satisfied).toBe(true);
    expect(q.pending).toBe(false);
    expect(q.signers).toBe(2);
  });

  it("returns pending=true between first proof and quorum threshold", () => {
    const env = makeDecision({
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: VM_BOB }),
        ],
      },
    });
    const q = deriveQuorumState(env, { required: 3 });
    expect(q.satisfied).toBe(false);
    expect(q.pending).toBe(true);
  });

  it("clamps negative required to 0 (degenerate but well-defined)", () => {
    const env = makeDecision({ payload: { proofs: [] } });
    const q = deriveQuorumState(env, { required: -5 });
    expect(q.required).toBe(0);
    expect(q.satisfied).toBe(true);
  });

  it("respects the roster — outsiders don't count", () => {
    const env = makeDecision({
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: "did:example:outsider#key-1" }),
        ],
      },
    });
    const q = deriveQuorumState(env, { required: 2, roster: [VM_ALICE, VM_BOB] });
    expect(q.signers).toBe(1);
    expect(q.satisfied).toBe(false);
  });
});

describe("buildSignerRoster", () => {
  it("emits one row per roster entry when a roster is supplied", () => {
    const env = makeDecision({
      payload: {
        proofs: [makeProof({ verificationMethod: VM_ALICE })],
      },
    });
    const roster = buildSignerRoster(env, { required: 2, roster: [VM_ALICE, VM_BOB, VM_CAROL] });
    expect(roster.map((r) => r.verificationMethod)).toEqual([VM_ALICE, VM_BOB, VM_CAROL]);
    expect(roster[0].signed).toBe(true);
    expect(roster[1].signed).toBe(false);
    expect(roster[2].signed).toBe(false);
  });

  it("emits one row per distinct observed signer when no roster is supplied", () => {
    const env = makeDecision({
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: VM_BOB }),
        ],
      },
    });
    const roster = buildSignerRoster(env, { required: 2 });
    expect(roster).toHaveLength(2);
    expect(roster.every((r) => r.signed)).toBe(true);
  });

  it("threads display names through when provided", () => {
    const env = makeDecision({
      payload: { proofs: [makeProof({ verificationMethod: VM_ALICE })] },
    });
    const roster = buildSignerRoster(env, { required: 1, roster: [VM_ALICE] }, {
      [VM_ALICE]: "Alice Approver",
    });
    expect(roster[0].display_name).toBe("Alice Approver");
  });

  it("carries the signedAt timestamp from the matching proof", () => {
    const env = makeDecision({
      payload: {
        proofs: [makeProof({ verificationMethod: VM_ALICE, created: "2026-05-20T08:10:00.000Z" })],
      },
    });
    const roster = buildSignerRoster(env, { required: 1, roster: [VM_ALICE, VM_BOB] });
    expect(roster[0].signedAt).toBe("2026-05-20T08:10:00.000Z");
    expect(roster[1].signedAt).toBeNull();
  });
});

describe("deriveDecisionTrustState", () => {
  it("returns verified for committed lifecycle regardless of quorum", () => {
    const env = makeDecision({ lifecycle: "committed", payload: { proofs: [] } });
    const q = deriveQuorumState(env, { required: 5 });
    expect(deriveDecisionTrustState(env, q)).toBe("verified");
  });

  it("returns verified when quorum satisfied even without lifecycle (legacy substrate)", () => {
    const env = makeDecision({
      lifecycle: undefined,
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: VM_BOB }),
        ],
      },
    });
    const q = deriveQuorumState(env, { required: 2 });
    expect(deriveDecisionTrustState(env, q)).toBe("verified");
  });

  it("returns pending for proposed lifecycle", () => {
    const env = makeDecision({ lifecycle: "proposed" });
    const q = deriveQuorumState(env, { required: 2 });
    expect(deriveDecisionTrustState(env, q)).toBe("pending");
  });

  it("returns pending when neither quorum nor lifecycle gives a signal", () => {
    const env = makeDecision({ lifecycle: undefined, evidence_ref: undefined });
    const q = deriveQuorumState(env, { required: 2 });
    expect(deriveDecisionTrustState(env, q)).toBe("pending");
  });

  it("returns verified when evidence_ref is present (legacy fallthrough)", () => {
    const env = makeDecision({ lifecycle: undefined, evidence_ref: "evidence://x/1" });
    const q = deriveQuorumState(env, { required: 5 });
    expect(deriveDecisionTrustState(env, q)).toBe("verified");
  });
});

describe("formatQuorumLabel", () => {
  it("formats as 'signers / required'", () => {
    expect(formatQuorumLabel({ signers: 2, required: 3, satisfied: false, pending: true })).toBe(
      "2 / 3",
    );
  });

  it("clamps negative or fractional inputs to safe display values", () => {
    expect(
      formatQuorumLabel({ signers: -1, required: 2.7, satisfied: false, pending: false }),
    ).toBe("0 / 2");
  });
});
