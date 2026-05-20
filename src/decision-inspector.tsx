"use client";

import { DecisionRow, type DecisionRowProps } from "./decision-row";
import type { ConnectionStatus, DecisionEnvelope, QuorumPolicy } from "./types";

const STATUS_TONE: Record<string, string> = {
  idle: "var(--gem-pending)",
  connecting: "var(--gem-pending)",
  open: "var(--gem-verified)",
  reconnecting: "var(--gem-warning)",
  closed: "var(--gem-pending)",
  error: "var(--gem-failed)",
};

/**
 * DecisionInspector — the pure-presentation root of `sm-decision-inspector`.
 *
 * Renders a queue of decision envelopes in reverse-chronological order with
 * an M-of-N quorum chip, signer roster, and approve/deny controls per row.
 *
 * SUBSTRATE-NEUTRAL. The consumer supplies `envelopes` and `status`. The
 * inspector never opens connections, polls endpoints, or makes any
 * network calls. The same load-bearing rule that lets the sibling
 * `sm-attest-viewer` work with any AAE source applies here.
 *
 * Props:
 *   - `envelopes`  — array of decision envelopes (newest-last; the inspector
 *                    reverses internally for newest-first display).
 *   - `policy`     — M-of-N quorum policy applied to every row.
 *   - `status`     — the consumer's current connection state.
 *   - `tenant`     — optional label rendered in the header.
 *   - `topicHint`  — optional substrate topic string shown next to tenant.
 *   - `title`      — header text. Defaults to "Decision Inspector".
 *   - `displayNames` / `onApprove` / `onDeny` / `alreadySigned` — pass-through
 *     to `DecisionRow` (see its prop documentation).
 */
export function DecisionInspector({
  envelopes,
  policy,
  status,
  tenant,
  topicHint,
  title = "Decision Inspector",
  displayNames,
  onApprove,
  onDeny,
  alreadySigned,
}: {
  envelopes: DecisionEnvelope[];
  policy: QuorumPolicy;
  status: ConnectionStatus;
  tenant?: string;
  topicHint?: string;
  title?: string;
  displayNames?: DecisionRowProps["displayNames"];
  onApprove?: DecisionRowProps["onApprove"];
  onDeny?: DecisionRowProps["onDeny"];
  alreadySigned?: boolean;
}) {
  const ordered = [...envelopes].reverse();
  return (
    <div className="flex h-full flex-col" data-testid="decision-inspector">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div className="space-y-0.5">
          <h1 className="text-sm font-semibold">{title}</h1>
          {topicHint || tenant ? (
            <p className="text-muted-foreground font-mono text-[11px]">{topicHint ?? tenant}</p>
          ) : null}
        </div>
        <span className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px]">
          <span
            aria-hidden
            data-testid="inspector-status-dot"
            className="inline-block h-2 w-2 rounded-full"
            style={{
              background: Object.hasOwn(STATUS_TONE, status)
                ? STATUS_TONE[status]
                : STATUS_TONE.idle,
            }}
          />
          <span data-testid="inspector-status-label">{status}</span>
        </span>
      </header>
      <div className="min-h-0 flex-1 px-4 pb-4 pt-2">
        {ordered.length === 0 ? (
          <p
            data-testid="decision-inspector-empty"
            className="text-muted-foreground py-6 text-center font-mono text-[12px]"
          >
            No decisions in queue.
          </p>
        ) : (
          <ol data-testid="decision-queue" className="space-y-2">
            {ordered.map((env) => (
              <DecisionRow
                key={env.id}
                envelope={env}
                policy={policy}
                displayNames={displayNames}
                onApprove={onApprove}
                onDeny={onDeny}
                alreadySigned={alreadySigned}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
