import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignerRoster } from "../src/signer-roster";
import type { SignerStatus } from "../src/types";

const VM_ALICE = "did:example:ops/approver-alice#key-1";
const VM_BOB = "did:example:ops/approver-bob#key-1";

describe("SignerRoster", () => {
  it("renders an empty marker when no signers are supplied", () => {
    render(<SignerRoster signers={[]} />);
    expect(screen.getByTestId("signer-roster-empty")).toBeInTheDocument();
  });

  it("renders one row per signer with signed status", () => {
    const signers: SignerStatus[] = [
      { verificationMethod: VM_ALICE, signed: true, display_name: "Alice", signedAt: null },
      { verificationMethod: VM_BOB, signed: false, display_name: null, signedAt: null },
    ];
    render(<SignerRoster signers={signers} />);
    expect(screen.getByTestId(`signer-row-${VM_ALICE}`).dataset.signed).toBe("true");
    expect(screen.getByTestId(`signer-row-${VM_BOB}`).dataset.signed).toBe("false");
  });

  it("falls back to a truncated DID label when display_name is missing", () => {
    const signers: SignerStatus[] = [
      { verificationMethod: VM_BOB, signed: false, display_name: null, signedAt: null },
    ];
    render(<SignerRoster signers={signers} />);
    expect(screen.getByText("approver-bob#key-1")).toBeInTheDocument();
  });

  it("renders signed-at time only for rows that have signed", () => {
    const signers: SignerStatus[] = [
      {
        verificationMethod: VM_ALICE,
        signed: true,
        display_name: "Alice",
        signedAt: "2026-05-20T08:10:33.000Z",
      },
      { verificationMethod: VM_BOB, signed: false, display_name: "Bob", signedAt: null },
    ];
    render(<SignerRoster signers={signers} />);
    expect(screen.getByText("08:10:33Z")).toBeInTheDocument();
  });

  it("does not crash on malformed signedAt strings", () => {
    const signers: SignerStatus[] = [
      {
        verificationMethod: VM_ALICE,
        signed: true,
        display_name: "Alice",
        signedAt: "not-a-date",
      },
    ];
    expect(() => render(<SignerRoster signers={signers} />)).not.toThrow();
  });
});
