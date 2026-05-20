/**
 * Pure quorum + signer-roster derivation for the Decision Inspector.
 *
 * All functions here are pure and exported for unit testing. Component
 * code in /decision-row.tsx, /quorum-chip.tsx, etc. composes these — never
 * inline derivation in JSX.
 */

import type {
  DecisionEnvelope,
  IntentProof,
  QuorumPolicy,
  QuorumState,
  SignerStatus,
  TrustState,
} from "./types";

/**
 * Distinct in-roster signers from a proof set.
 *
 * "Distinct" is keyed on `verificationMethod` — two proofs sharing a
 * verification method are treated as the same signer (idempotent
 * countersignature). Proofs whose `verificationMethod` is missing or
 * blank are skipped.
 *
 * When `roster` is provided, only proofs whose `verificationMethod`
 * appears in the roster are counted. When `roster` is absent, every
 * distinct signer counts.
 */
export function distinctSigners(
  proofs: readonly IntentProof[] | undefined,
  roster?: readonly string[],
): string[] {
  if (!proofs || proofs.length === 0) return [];
  const allow = roster && roster.length > 0 ? new Set(roster) : null;
  const seen = new Set<string>();
  for (const p of proofs) {
    const vm = typeof p.verificationMethod === "string" ? p.verificationMethod.trim() : "";
    if (!vm) continue;
    if (allow && !allow.has(vm)) continue;
    seen.add(vm);
  }
  return [...seen];
}

/**
 * Derive quorum state from a decision envelope's proof set.
 *
 * Behavior:
 *
 *   - `signers`   = number of distinct in-roster signers (see distinctSigners).
 *   - `required`  = `policy.required` clamped to non-negative integers.
 *   - `satisfied` = signers >= required.
 *   - `pending`   = at least one proof is present but quorum not yet met.
 *
 * No-proof envelopes are `satisfied: false, pending: false` — the operator
 * hasn't started countersigning yet. A quorum policy with `required: 0`
 * is degenerate but valid: any envelope satisfies it (operator opt-out).
 */
export function deriveQuorumState(
  envelope: DecisionEnvelope,
  policy: QuorumPolicy,
): QuorumState {
  const required = Math.max(0, Math.floor(policy.required));
  const signers = distinctSigners(envelope.payload?.proofs, policy.roster).length;
  return {
    signers,
    required,
    satisfied: signers >= required,
    pending: signers > 0 && signers < required,
  };
}

/**
 * Build the SignerRoster rows.
 *
 * - When `policy.roster` is present, one row per roster entry in declared
 *   order — including operators who have NOT yet signed (signed: false).
 * - When `policy.roster` is absent, one row per distinct signer observed
 *   in the proof set, in first-seen order.
 *
 * `display_name` is sourced from `displayNames[verificationMethod]` when
 * the consumer provides a lookup; otherwise null.
 */
export function buildSignerRoster(
  envelope: DecisionEnvelope,
  policy: QuorumPolicy,
  displayNames?: Readonly<Record<string, string | null>>,
): SignerStatus[] {
  const proofs = envelope.payload?.proofs ?? [];
  const signedAtByVm = new Map<string, string | undefined>();
  for (const p of proofs) {
    const vm = typeof p.verificationMethod === "string" ? p.verificationMethod.trim() : "";
    if (!vm) continue;
    if (!signedAtByVm.has(vm)) signedAtByVm.set(vm, p.created);
  }

  if (policy.roster && policy.roster.length > 0) {
    return policy.roster.map((vm) => ({
      verificationMethod: vm,
      signed: signedAtByVm.has(vm),
      display_name: displayNames?.[vm] ?? null,
      signedAt: signedAtByVm.get(vm) ?? null,
    }));
  }

  return [...signedAtByVm.keys()].map((vm) => ({
    verificationMethod: vm,
    signed: true,
    display_name: displayNames?.[vm] ?? null,
    signedAt: signedAtByVm.get(vm) ?? null,
  }));
}

/**
 * Trust-state derivation for a decision envelope.
 *
 * The inspector reads trust state with the same rules as the AAE SPEC §11.2
 * mapping (verified / warning / failed / pending) — see the sibling
 * `sm-attest-viewer` for the full table. Decision envelopes follow the
 * same lifecycle ladder as action envelopes, with one additional rule:
 *
 *   - A satisfied quorum upgrades `pending` → `verified` when no lifecycle
 *     marker is present (legacy substrate). This reflects the operator-side
 *     truth that an M-of-N satisfied decision IS the trust signal.
 */
export function deriveDecisionTrustState(
  envelope: DecisionEnvelope,
  quorum: QuorumState,
): TrustState {
  if (envelope.lifecycle === "signed" ||
      envelope.lifecycle === "committed" ||
      envelope.lifecycle === "anchored") {
    return "verified";
  }
  if (envelope.lifecycle === "reconciled") {
    return "verified";
  }
  if (envelope.lifecycle === "proposed") {
    return "pending";
  }
  if (envelope.evidence_ref) return "verified";
  if (quorum.satisfied) return "verified";
  return "pending";
}

/**
 * Format a percentage label for a quorum chip ("2 / 3").
 *
 * Defensive: clamps negative or non-integer inputs to safe display values
 * rather than rendering NaN or fractional signer counts.
 */
export function formatQuorumLabel(quorum: QuorumState): string {
  const signers = Math.max(0, Math.floor(quorum.signers));
  const required = Math.max(0, Math.floor(quorum.required));
  return `${signers} / ${required}`;
}
