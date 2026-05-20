import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionRow } from "../src/decision-row";
import { TooltipProvider } from "../src/ui/tooltip";
import { makeDecision, makeProof } from "./helpers/make-decision";
import { decisionFixtures } from "../fixtures/index";

function renderRow(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const VM_ALICE = "did:example:ops/approver-alice#key-1";
const VM_BOB = "did:example:ops/approver-bob#key-1";
const VM_CAROL = "did:example:ops/approver-carol#key-1";

describe("DecisionRow", () => {
  it("renders kind, classification, and quorum chip together", () => {
    const env = makeDecision({
      id: "dr-1",
      classification: "restricted",
      payload: {
        kind: "operator_authorize",
        proofs: [makeProof({ verificationMethod: VM_ALICE })],
      },
    });
    renderRow(<DecisionRow envelope={env} policy={{ required: 2 }} />);
    expect(screen.getByTestId("decision-row-dr-1")).toBeInTheDocument();
    expect(screen.getByText("operator_authorize")).toBeInTheDocument();
    expect(screen.getByText("restricted")).toBeInTheDocument();
    expect(screen.getByTestId("quorum-chip-pending")).toBeInTheDocument();
  });

  it("derives trust-state border from the satisfied-quorum legacy fallthrough", () => {
    const env = makeDecision({
      id: "dr-2",
      lifecycle: undefined,
      payload: {
        proofs: [
          makeProof({ verificationMethod: VM_ALICE }),
          makeProof({ verificationMethod: VM_BOB }),
        ],
      },
    });
    renderRow(<DecisionRow envelope={env} policy={{ required: 2 }} />);
    expect(screen.getByTestId("decision-row-dr-2").dataset.trustState).toBe("verified");
  });

  it("renders the signer roster by default and hides it when showRoster=false", () => {
    const env = makeDecision({
      id: "dr-3",
      payload: { proofs: [makeProof({ verificationMethod: VM_ALICE })] },
    });
    const { rerender } = renderRow(
      <DecisionRow envelope={env} policy={{ required: 1, roster: [VM_ALICE, VM_BOB] }} />,
    );
    expect(screen.getByTestId("signer-roster")).toBeInTheDocument();
    rerender(
      <TooltipProvider>
        <DecisionRow
          envelope={env}
          policy={{ required: 1, roster: [VM_ALICE, VM_BOB] }}
          showRoster={false}
        />
      </TooltipProvider>,
    );
    expect(screen.queryByTestId("signer-roster")).toBeNull();
  });

  it("renders controls only when both callbacks are supplied", () => {
    const env = makeDecision({ id: "dr-4" });
    const { rerender } = renderRow(<DecisionRow envelope={env} policy={{ required: 1 }} />);
    expect(screen.queryByTestId("approve-deny-controls")).toBeNull();
    rerender(
      <TooltipProvider>
        <DecisionRow
          envelope={env}
          policy={{ required: 1 }}
          onApprove={vi.fn()}
          onDeny={vi.fn()}
        />
      </TooltipProvider>,
    );
    expect(screen.getByTestId("approve-deny-controls")).toBeInTheDocument();
  });

  it("propagates Approve clicks with the envelope payload", async () => {
    const env = makeDecision({ id: "dr-5" });
    const onApprove = vi.fn();
    const user = userEvent.setup();
    renderRow(
      <DecisionRow
        envelope={env}
        policy={{ required: 1 }}
        onApprove={onApprove}
        onDeny={vi.fn()}
      />,
    );
    await user.click(screen.getByTestId("approve-button"));
    expect(onApprove).toHaveBeenCalledWith(env);
  });

  it("does not crash on a malicious classification label", () => {
    const env = makeDecision({ id: "evil-class", classification: "__proto__" });
    expect(() =>
      renderRow(<DecisionRow envelope={env} policy={{ required: 1 }} />),
    ).not.toThrow();
    expect(screen.getByTestId("decision-row-evil-class")).toBeInTheDocument();
  });

  it("renders ??:??:?? for a malformed timestamp", () => {
    const env = makeDecision({ id: "bad-ts", ts: "not-a-real-date" });
    renderRow(<DecisionRow envelope={env} policy={{ required: 1 }} />);
    expect(screen.getByText(/\?\?:\?\?:\?\?Z/)).toBeInTheDocument();
  });

  it("renders the 3-of-5 satisfied fixture with quorum=satisfied", () => {
    renderRow(
      <DecisionRow
        envelope={decisionFixtures.threeOfFiveSatisfied}
        policy={{
          required: 3,
          roster: [
            VM_ALICE,
            VM_BOB,
            VM_CAROL,
            "did:example:ops/approver-dave#key-1",
            "did:example:ops/approver-eve#key-1",
          ],
        }}
      />,
    );
    expect(screen.getByTestId("quorum-chip-satisfied")).toBeInTheDocument();
  });
});
