"use client";

import { Badge } from "./ui/badge";
import { cn } from "./lib/utils";
import { formatQuorumLabel } from "./quorum-logic";
import type { QuorumState } from "./types";

/**
 * QuorumChip — visual M-of-N indicator.
 *
 * Renders the current `signers / required` count with a tone that reflects
 * quorum status:
 *
 *   satisfied → green (decision is committable)
 *   pending   → amber (at least one signer, not yet enough)
 *   empty     → neutral (no signers yet)
 *
 * The chip is presentation-only. Consumers wiring countersign actions
 * should treat `QuorumChip` as readout and put any button affordances in
 * `ApproveDenyControls`.
 */
const TONE_BY_STATUS = {
  satisfied: "bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  pending: "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  empty: "bg-transparent text-muted-foreground",
} as const;

function statusOf(quorum: QuorumState): keyof typeof TONE_BY_STATUS {
  if (quorum.satisfied) return "satisfied";
  if (quorum.pending) return "pending";
  return "empty";
}

export function QuorumChip({
  quorum,
  className,
}: {
  quorum: QuorumState;
  className?: string;
}) {
  const status = statusOf(quorum);
  return (
    <Badge
      variant="outline"
      data-testid={`quorum-chip-${status}`}
      data-quorum-status={status}
      className={cn(
        "border-transparent font-mono text-[10px] tracking-wide uppercase",
        TONE_BY_STATUS[status],
        className,
      )}
    >
      <span aria-label="quorum">{formatQuorumLabel(quorum)}</span>
    </Badge>
  );
}
