"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "./lib/utils";
import type { SignerStatus } from "./types";

/**
 * SignerRoster — collapsible list of who has and hasn't countersigned.
 *
 * Substrate-neutral: takes a pre-computed `SignerStatus[]` (see
 * `quorum-logic.ts:buildSignerRoster`). No I/O, no fetching.
 *
 * Renders each row with:
 *   - A signed/unsigned status icon (filled check vs. hollow circle).
 *   - The signer's display name when available, otherwise the trailing
 *     fragment of the verification method DID URL.
 *   - The signature timestamp when the signer has countersigned.
 *
 * The roster is rendered as an ordered <ol> with each row a stable
 * `data-testid="signer-row-<verificationMethod>"` so consumers can target
 * specific signers in tests.
 */
function shortDid(verificationMethod: string): string {
  const tail = verificationMethod.split("/").pop() ?? verificationMethod;
  return tail.length > 32 ? `${tail.slice(0, 32)}…` : tail;
}

function formatSignedAt(ts: string | null | undefined): string | null {
  if (!ts) return null;
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(11, 19) + "Z";
  } catch {
    return null;
  }
}

export function SignerRoster({
  signers,
  className,
}: {
  signers: readonly SignerStatus[];
  className?: string;
}) {
  if (signers.length === 0) {
    return (
      <p
        data-testid="signer-roster-empty"
        className={cn("text-muted-foreground font-mono text-[11px]", className)}
      >
        No signers yet.
      </p>
    );
  }
  return (
    <ol
      data-testid="signer-roster"
      className={cn("space-y-1", className)}
    >
      {signers.map((s) => {
        const label = s.display_name ?? shortDid(s.verificationMethod);
        const signedAt = formatSignedAt(s.signedAt);
        return (
          <li
            key={s.verificationMethod}
            data-testid={`signer-row-${s.verificationMethod}`}
            data-signed={s.signed ? "true" : "false"}
            className="flex items-center gap-2 font-mono text-[11px]"
          >
            {s.signed ? (
              <Check
                aria-label="signed"
                className="h-3 w-3 text-emerald-600 dark:text-emerald-400"
              />
            ) : (
              <Circle
                aria-label="awaiting signature"
                className="text-muted-foreground h-3 w-3"
              />
            )}
            <span className="text-foreground truncate">{label}</span>
            {signedAt ? (
              <span className="text-muted-foreground ml-auto tabular-nums">{signedAt}</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
