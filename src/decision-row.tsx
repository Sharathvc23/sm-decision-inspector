"use client";

import { Badge } from "./ui/badge";
import { QuorumChip } from "./quorum-chip";
import { ApproveDenyControls, type ApproveDenyControlsProps } from "./approve-deny-controls";
import { SignerRoster } from "./signer-roster";
import { cn } from "./lib/utils";
import {
  buildSignerRoster,
  deriveDecisionTrustState,
  deriveQuorumState,
} from "./quorum-logic";
import type { DecisionEnvelope, QuorumPolicy, TrustState } from "./types";

const BORDER_BY_TRUST: Record<TrustState, string> = {
  verified: "border-l-[var(--gem-verified)]",
  warning: "border-l-[var(--gem-warning)]",
  failed: "border-l-[var(--gem-failed)]",
  pending: "border-l-[var(--gem-pending)]",
};

const DEFAULT_CLASSIFICATION_TONE: Record<string, string> = {
  public: "bg-transparent text-muted-foreground",
  internal: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
  restricted: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  confidential: "bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
};
const NEUTRAL_TONE = "bg-transparent text-muted-foreground";

function classificationTone(label: unknown): string {
  if (typeof label !== "string") return NEUTRAL_TONE;
  const key = label.toLowerCase();
  return Object.hasOwn(DEFAULT_CLASSIFICATION_TONE, key)
    ? DEFAULT_CLASSIFICATION_TONE[key]
    : NEUTRAL_TONE;
}

function formatRowTime(ts: string): string {
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return "??:??:??";
    return d.toISOString().slice(11, 19);
  } catch {
    return "??:??:??";
  }
}

/**
 * DecisionRow — single decision envelope in the inspector queue.
 *
 * Renders at-a-glance:
 *   - Trust-state border-left (verified/pending/warning/failed)
 *   - Decision kind + classification badges
 *   - QuorumChip (M-of-N readout)
 *   - Wall-clock time
 *   - Expandable SignerRoster
 *   - ApproveDenyControls (when callbacks are wired)
 */
export type DecisionRowProps = {
  envelope: DecisionEnvelope;
  policy: QuorumPolicy;
  /**
   * Optional `verificationMethod → display_name` map for friendlier
   * signer roster labels. Unknown signers fall back to a truncated DID.
   */
  displayNames?: Readonly<Record<string, string | null>>;
  /**
   * Approve/deny callbacks. When omitted, the controls are not rendered
   * (read-only view). When provided, controls follow the disable rules in
   * `ApproveDenyControls`.
   */
  onApprove?: ApproveDenyControlsProps["onApprove"];
  onDeny?: ApproveDenyControlsProps["onDeny"];
  /** Pass-through to ApproveDenyControls. */
  alreadySigned?: boolean;
  /** Render the signer roster inline (default: true). */
  showRoster?: boolean;
};

export function DecisionRow({
  envelope,
  policy,
  displayNames,
  onApprove,
  onDeny,
  alreadySigned = false,
  showRoster = true,
}: DecisionRowProps) {
  const quorum = deriveQuorumState(envelope, policy);
  const trust = deriveDecisionTrustState(envelope, quorum);
  const trustBorder = Object.hasOwn(BORDER_BY_TRUST, trust)
    ? BORDER_BY_TRUST[trust]
    : BORDER_BY_TRUST.pending;
  const tone = classificationTone(envelope.classification);
  const kindLabel = envelope.payload?.kind ?? "decision";
  const formattedTime = formatRowTime(envelope.ts);
  const roster = buildSignerRoster(envelope, policy, displayNames);
  const showControls = typeof onApprove === "function" && typeof onDeny === "function";

  return (
    <li
      data-testid={`decision-row-${envelope.id}`}
      data-classification={envelope.classification}
      data-trust-state={trust}
      className={cn(
        "bg-card grid grid-cols-1 gap-2 rounded-sm border-l-2 px-3 py-2 text-[12px]",
        trustBorder,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="font-mono text-[9px] uppercase">
          {kindLabel}
        </Badge>
        <Badge
          variant="outline"
          className={cn("border-transparent font-mono text-[9px] uppercase", tone)}
        >
          {envelope.classification}
        </Badge>
        <QuorumChip quorum={quorum} />
        <time
          className="text-muted-foreground ml-auto shrink-0 font-mono text-[10px] tabular-nums"
          dateTime={envelope.ts}
        >
          {formattedTime}Z
        </time>
      </div>
      {envelope.payload?.annotation ? (
        <p
          data-testid="decision-annotation"
          className="text-foreground/80 font-mono text-[11px] leading-snug"
        >
          {envelope.payload.annotation}
        </p>
      ) : null}
      {showRoster ? <SignerRoster signers={roster} /> : null}
      {showControls ? (
        <ApproveDenyControls
          envelope={envelope}
          quorum={quorum}
          onApprove={onApprove}
          onDeny={onDeny}
          alreadySigned={alreadySigned}
        />
      ) : null}
    </li>
  );
}
