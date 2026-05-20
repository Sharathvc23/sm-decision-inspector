import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApproveDenyControls } from "../src/approve-deny-controls";
import { makeDecision } from "./helpers/make-decision";
import type { QuorumState } from "../src/types";

function quorum(overrides: Partial<QuorumState> = {}): QuorumState {
  return { signers: 0, required: 2, satisfied: false, pending: false, ...overrides };
}

describe("ApproveDenyControls", () => {
  it("invokes onApprove with the envelope when Approve is clicked", async () => {
    const envelope = makeDecision();
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const user = userEvent.setup();
    render(
      <ApproveDenyControls
        envelope={envelope}
        quorum={quorum()}
        onApprove={onApprove}
        onDeny={onDeny}
      />,
    );
    await user.click(screen.getByTestId("approve-button"));
    expect(onApprove).toHaveBeenCalledWith(envelope);
    expect(onDeny).not.toHaveBeenCalled();
  });

  it("invokes onDeny with the envelope when Deny is clicked", async () => {
    const envelope = makeDecision();
    const onApprove = vi.fn();
    const onDeny = vi.fn();
    const user = userEvent.setup();
    render(
      <ApproveDenyControls
        envelope={envelope}
        quorum={quorum()}
        onApprove={onApprove}
        onDeny={onDeny}
      />,
    );
    await user.click(screen.getByTestId("deny-button"));
    expect(onDeny).toHaveBeenCalledWith(envelope);
    expect(onApprove).not.toHaveBeenCalled();
  });

  it("disables both buttons when the quorum is satisfied", () => {
    render(
      <ApproveDenyControls
        envelope={makeDecision()}
        quorum={quorum({ satisfied: true, signers: 2, required: 2 })}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
      />,
    );
    expect(screen.getByTestId("approve-button")).toBeDisabled();
    expect(screen.getByTestId("deny-button")).toBeDisabled();
    expect(screen.getByTestId("controls-hint")).toHaveTextContent(/quorum reached/i);
  });

  it("disables both buttons when alreadySigned is true", () => {
    render(
      <ApproveDenyControls
        envelope={makeDecision()}
        quorum={quorum()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        alreadySigned
      />,
    );
    expect(screen.getByTestId("approve-button")).toBeDisabled();
    expect(screen.getByTestId("controls-hint")).toHaveTextContent(/already countersigned/i);
  });

  it("respects explicit disabled overrides per button", () => {
    render(
      <ApproveDenyControls
        envelope={makeDecision()}
        quorum={quorum()}
        onApprove={vi.fn()}
        onDeny={vi.fn()}
        approveDisabled
      />,
    );
    expect(screen.getByTestId("approve-button")).toBeDisabled();
    expect(screen.getByTestId("deny-button")).not.toBeDisabled();
  });
});
