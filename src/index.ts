/**
 * sm-decision-inspector — public API.
 *
 * Reference HITL workbench for AAE decision envelopes.
 * See README.md for usage and SPEC.md for the wire format and quorum
 * semantics.
 */

export { DecisionInspector } from "./decision-inspector";
export { DecisionRow, type DecisionRowProps } from "./decision-row";
export { QuorumChip } from "./quorum-chip";
export { SignerRoster } from "./signer-roster";
export {
  ApproveDenyControls,
  type ApproveDenyControlsProps,
} from "./approve-deny-controls";

export {
  deriveQuorumState,
  deriveDecisionTrustState,
  distinctSigners,
  buildSignerRoster,
  formatQuorumLabel,
} from "./quorum-logic";

export {
  type AAEActor,
  type AAEClassification,
  type AAELifecycle,
  type ConnectionStatus,
  type DecisionEnvelope,
  type DecisionPayload,
  type DecisionSubject,
  type IntentProof,
  type QuorumPolicy,
  type QuorumState,
  type SignerStatus,
  type TrustState,
} from "./types";

export { TooltipProvider } from "./ui/tooltip";
