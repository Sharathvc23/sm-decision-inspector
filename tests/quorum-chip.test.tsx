import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuorumChip } from "../src/quorum-chip";
import type { QuorumState } from "../src/types";

function quorum(overrides: Partial<QuorumState> = {}): QuorumState {
  return { signers: 0, required: 1, satisfied: false, pending: false, ...overrides };
}

describe("QuorumChip", () => {
  it("renders an empty-status chip when no signers", () => {
    render(<QuorumChip quorum={quorum({ signers: 0, required: 3 })} />);
    expect(screen.getByTestId("quorum-chip-empty")).toBeInTheDocument();
    expect(screen.getByText("0 / 3")).toBeInTheDocument();
  });

  it("renders a pending-status chip mid-way to quorum", () => {
    render(<QuorumChip quorum={quorum({ signers: 1, required: 3, pending: true })} />);
    const chip = screen.getByTestId("quorum-chip-pending");
    expect(chip).toBeInTheDocument();
    expect(chip.dataset.quorumStatus).toBe("pending");
  });

  it("renders a satisfied-status chip when quorum reached", () => {
    render(
      <QuorumChip quorum={quorum({ signers: 3, required: 3, satisfied: true, pending: false })} />,
    );
    expect(screen.getByTestId("quorum-chip-satisfied")).toBeInTheDocument();
  });
});
