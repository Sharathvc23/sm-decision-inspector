"use client";

import { Button } from "./ui/button";
import { cn } from "./lib/utils";
import type { DecisionEnvelope, QuorumState } from "./types";

/**
 * ApproveDenyControls — operator gesture surface.
 *
 * Substrate-neutral: this primitive does NOT sign envelopes itself, does
 * NOT hold private keys, and does NOT make network calls. It is a
 * controlled set of buttons whose `onApprove` / `onDeny` callbacks the
 * consumer wires to its own server-side signing endpoint (the standard
 * HITL pattern: the browser collects the operator's gesture, the
 * server-side service signs).
 *
 * Disable rules:
 *
 *   - When the decision's quorum is already `satisfied`, both buttons
 *     are disabled with a "quorum reached" hint.
 *   - When the consumer flags `alreadySigned: true` (e.g. the active
 *     operator's DID is in the proof set already), both buttons are
 *     disabled with a "you've already signed" hint.
 *   - Consumers MAY override via `disabled` on either button explicitly.
 */
export type ApproveDenyControlsProps = {
  envelope: DecisionEnvelope;
  quorum: QuorumState;
  onApprove: (envelope: DecisionEnvelope) => void;
  onDeny: (envelope: DecisionEnvelope) => void;
  /** True when the active operator has already countersigned this envelope. */
  alreadySigned?: boolean;
  /** Override approve button disabled state (consumer wins). */
  approveDisabled?: boolean;
  /** Override deny button disabled state (consumer wins). */
  denyDisabled?: boolean;
  className?: string;
};

export function ApproveDenyControls({
  envelope,
  quorum,
  onApprove,
  onDeny,
  alreadySigned = false,
  approveDisabled,
  denyDisabled,
  className,
}: ApproveDenyControlsProps) {
  const lockedByQuorum = quorum.satisfied;
  const baseDisabled = lockedByQuorum || alreadySigned;
  const approveOff = approveDisabled ?? baseDisabled;
  const denyOff = denyDisabled ?? baseDisabled;

  let hint: string | null = null;
  if (alreadySigned) hint = "You have already countersigned this decision.";
  else if (lockedByQuorum) hint = "Quorum reached — decision is locked.";

  return (
    <div
      data-testid="approve-deny-controls"
      data-locked={baseDisabled ? "true" : "false"}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          data-testid="approve-button"
          disabled={approveOff}
          onClick={() => onApprove(envelope)}
        >
          Approve
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          data-testid="deny-button"
          disabled={denyOff}
          onClick={() => onDeny(envelope)}
        >
          Deny
        </Button>
      </div>
      {hint ? (
        <p data-testid="controls-hint" className="text-muted-foreground text-[10px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
