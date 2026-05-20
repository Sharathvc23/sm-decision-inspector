/**
 * Decision-inspector — local types.
 *
 * Mirrors the AAE wire envelope as defined in the Attested Action Envelope
 * specification (see SPEC.md). The inspector is substrate-neutral: it
 * accepts decision envelopes shaped like `DecisionEnvelope` from any
 * source — AG-UI streams, MCP tool outputs, JSONL files, websockets.
 *
 * Quorum state is derived from the envelope's `payload.proofs[]` block.
 * See `quorum-logic.ts:deriveQuorumState`.
 */

/**
 * Classification label per AAE SPEC §3.2. Free-form string defined by the
 * consumer's information-handling policy.
 *
 * Examples consumers commonly use:
 *   "public" | "internal" | "restricted" | "confidential"
 */
export type AAEClassification = string;

/**
 * Lifecycle markers from AAE SPEC §6. An AAE moves monotonically through
 * these states:
 *
 *   proposed → signed → committed → anchored → reconciled
 */
export type AAELifecycle =
  | "proposed"
  | "signed"
  | "committed"
  | "anchored"
  | "reconciled";

/**
 * Trust state surfaced to operators. Derived from the envelope's lifecycle
 * marker (when present) and proof verification status.
 */
export type TrustState = "verified" | "warning" | "failed" | "pending";

/** Actor identity attached to every event. */
export type AAEActor = {
  namespace: string;
  value: string;
  did: string | null;
  display_name?: string | null;
};

/** Subject is an AgentId-shaped dict; substrates surface it alongside actor. */
export type DecisionSubject = {
  namespace?: string;
  value?: string;
  did?: string | null;
};

/**
 * IntentProof — a single signature attached to a decision envelope.
 *
 * One envelope MAY carry multiple `IntentProof` entries to satisfy an
 * M-of-N quorum policy (see SPEC §6). Each proof carries the signer's
 * verification method and the signed bytes; verification is the consumer's
 * responsibility — the inspector treats the proof block as opaque shape.
 */
export type IntentProof = {
  /** W3C VC proof type, e.g. `Ed25519Signature2020`, `DataIntegrityProof`. */
  type?: string;
  /** Cryptosuite identifier for VC 2.0 `DataIntegrityProof` proofs. */
  cryptosuite?: string;
  /** When the signature was applied (RFC 3339). */
  created?: string;
  /** Signer's DID URL (e.g. `did:example:operator-alice#key-1`). */
  verificationMethod?: string;
  /** Free-form proof purpose; typically `assertionMethod`. */
  proofPurpose?: string;
  /** Base58- or base64-encoded signature bytes. */
  proofValue?: string;
};

/**
 * Wire payload for a decision envelope (`type: "decision"` per AAE SPEC §13).
 *
 * The payload carries the operator decision metadata and the proof set.
 * Renderers MUST treat unknown payload keys as opaque and ignore them.
 */
export type DecisionPayload = {
  subject?: DecisionSubject;
  /**
   * Operator-defined decision verb — e.g. `"operator_authorize"`,
   * `"operator_deny"`, `"operator_annotate"`. Free-form; consumers define
   * their own taxonomy.
   */
  kind?: string;
  /** Optional free-text annotation accompanying the decision. */
  annotation?: string;
  /** When the operator's decision was recorded. */
  recorded_at?: string;
  /**
   * Multi-signature proof set. A decision under an M-of-N quorum policy
   * accumulates one `IntentProof` per countersigning operator until the
   * required count is reached (see SPEC §6).
   */
  proofs?: IntentProof[];
};

/**
 * Decision-envelope wire shape — an AAE envelope (SPEC §3) narrowed to the
 * `"decision"` discriminator variant per SPEC §13.
 */
export type DecisionEnvelope = {
  v: 1;
  id: string;
  ts: string;
  tenant: string;
  actor: AAEActor;
  topic: string;
  /** Envelope-kind discriminator. Always `"decision"` for this package. */
  type: "decision";
  /** Consumer-defined sensitivity label. */
  classification: AAEClassification;
  payload: DecisionPayload;
  /** Lifecycle marker per AAE SPEC §6. Optional. */
  lifecycle?: AAELifecycle;
  evidence_ref?: string;
  /** Causal-chain identifier shared across related events. */
  trace_id?: string;
  /**
   * Hash of the predecessor envelope in the decision chain — typically the
   * `"action"` envelope whose attempted effect this decision authorizes,
   * denies, or annotates. Renderers MAY surface this as a chain-walk
   * affordance.
   */
  predecessor_hash?: string;
};

/**
 * Required-signers policy — the M-of-N quorum threshold a decision envelope
 * must satisfy before its effect commits.
 *
 *   - `required`: minimum number of distinct countersigners (M).
 *   - `roster`:   optional explicit list of acceptable signer DIDs (N).
 *                 When present, proofs whose `verificationMethod` doesn't
 *                 belong to the roster are NOT counted toward `required`.
 *                 When absent, any distinct signer counts.
 */
export type QuorumPolicy = {
  required: number;
  roster?: string[];
};

/**
 * Derived quorum state — the inspector's view of "how close is this decision
 * to satisfying its quorum policy?" Surfaced as the QuorumChip primitive.
 */
export type QuorumState = {
  /** Distinct, in-roster (if applicable) signers seen so far. */
  signers: number;
  /** Quorum threshold (`policy.required`). */
  required: number;
  /** True when `signers >= required`. */
  satisfied: boolean;
  /** True when at least one proof is present but quorum is not yet met. */
  pending: boolean;
};

/**
 * Signer-status row used by the SignerRoster primitive. One entry per
 * roster member when an explicit roster is present; otherwise one entry
 * per distinct signer observed in the proof set.
 */
export type SignerStatus = {
  /** Verification method DID URL. */
  verificationMethod: string;
  /** Has this signer countersigned the decision? */
  signed: boolean;
  /** Optional human-renderable label. */
  display_name?: string | null;
  /** Signature timestamp from the matching IntentProof, when present. */
  signedAt?: string | null;
};

/** Connection states the inspector recognizes for its empty/header chrome. */
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed"
  | "error";
